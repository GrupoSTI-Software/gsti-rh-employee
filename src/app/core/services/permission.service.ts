import { Injectable, signal, computed, PLATFORM_ID, inject, DestroyRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { LoggerService } from '@core/services/logger.service';

/**
 * Estados posibles para un permiso del navegador.
 *
 * - `granted`: Permiso concedido
 * - `denied`: Permiso explícitamente denegado
 * - `prompt`: El navegador aún puede mostrar el diálogo de solicitud
 * - `unknown`: No se pudo determinar el estado (API no disponible, error transitorio, etc.)
 */
export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

const GEOLOCATION_TIMEOUT_MS = 15_000;

/**
 * Servicio dedicado a la verificación y monitoreo de permisos de cámara y ubicación.
 *
 * Usa la Permissions API del navegador como fuente primaria (con listeners `onchange`
 * para reaccionar automáticamente cuando el usuario cambia permisos desde Ajustes),
 * y recurre a fallbacks (`getUserMedia`, `getCurrentPosition`) cuando la API no está
 * disponible (p. ej. Safari iOS no soporta `query('camera')`).
 */
@Injectable({
  providedIn: 'root',
})
export class PermissionService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly logger = inject(LoggerService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly _cameraPermission = signal<PermissionState>('unknown');
  private readonly _locationPermission = signal<PermissionState>('unknown');
  private readonly _checking = signal(false);

  /** Estado actual del permiso de cámara */
  readonly cameraPermission = this._cameraPermission.asReadonly();
  /** Estado actual del permiso de ubicación */
  readonly locationPermission = this._locationPermission.asReadonly();
  /** Indica si se está verificando/solicitando permisos activamente */
  readonly checking = this._checking.asReadonly();

  /**
   * Conveniencia: `true` si ambos permisos están concedidos
   */
  readonly allGranted = computed(
    () => this._cameraPermission() === 'granted' && this._locationPermission() === 'granted',
  );

  /**
   * `true` si al menos un permiso está explícitamente denegado
   */
  readonly hasDenied = computed(
    () => this._cameraPermission() === 'denied' || this._locationPermission() === 'denied',
  );

  /**
   * `true` si el permiso de cámara equivale a concedido (`boolean | null` compat.)
   */
  readonly cameraGranted = computed(() => this._cameraPermission() === 'granted');

  /**
   * `true` si el permiso de ubicación equivale a concedido
   */
  readonly locationGranted = computed(() => this._locationPermission() === 'granted');

  private cameraPermissionStatus: PermissionStatus | null = null;
  private locationPermissionStatus: PermissionStatus | null = null;
  private visibilityHandler: (() => void) | null = null;

  /**
   * Verifica los permisos de cámara y ubicación al inicializar.
   * Registra listeners `onchange` y `visibilitychange` para mantener el estado actualizado.
   */
  async checkPermissions(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this._checking.set(true);
    try {
      await Promise.all([this.checkCameraPermission(), this.checkLocationPermission()]);
    } finally {
      this._checking.set(false);
    }

    this.registerVisibilityListener();
  }

  /**
   * Solicita permisos activamente abriendo cámara y geolocalización.
   * Útil para el botón "Volver a verificar permisos" de la UI.
   */
  async requestPermissions(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this._checking.set(true);
    try {
      await this.requestCameraPermission();
      await this.requestLocationPermission();
    } finally {
      this._checking.set(false);
    }
  }

  /**
   * Verifica y solicita el permiso de cámara. Actualiza el signal y lanza error
   * si el permiso está denegado. Usado por `ensurePermissions()`.
   *
   * @throws Error si el permiso de cámara es denegado o no disponible
   */
  async ensureCameraPermission(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    await this.requestCameraPermission();

    if (this._cameraPermission() === 'denied') {
      throw new Error('Se necesita permiso de cámara para registrar asistencia.');
    }

    if (this._cameraPermission() !== 'granted') {
      throw new Error('No se pudo verificar el permiso de cámara.');
    }
  }

  /**
   * Verifica y solicita el permiso de ubicación. Actualiza el signal y lanza error
   * si el permiso está denegado. Usado por `ensurePermissions()`.
   *
   * @throws Error si el permiso de ubicación es denegado o no disponible
   */
  async ensureLocationPermission(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    await this.requestLocationPermission();

    if (this._locationPermission() === 'denied') {
      throw new Error('Se necesita permiso de ubicación para registrar asistencia.');
    }

    if (this._locationPermission() !== 'granted') {
      throw new Error('No se pudo verificar el permiso de ubicación.');
    }
  }

  /**
   * Detecta si el dispositivo es iOS (iPhone, iPad, iPod Touch).
   */
  isIosPlatform(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return (
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.userAgent.includes('Mac') && navigator.maxTouchPoints > 1)
    );
  }

  /**
   * Limpia listeners de PermissionStatus y visibilitychange.
   */
  destroy(): void {
    this.removeCameraPermissionListener();
    this.removeLocationPermissionListener();
    this.removeVisibilityListener();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Cámara
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Verifica el estado del permiso de cámara usando la Permissions API (Chrome/Edge)
   * con fallback a getUserMedia (Safari/iOS).
   */
  private async checkCameraPermission(): Promise<void> {
    if (await this.checkCameraViaPermissionsApi()) return;
    await this.checkCameraViaGetUserMedia();
  }

  /**
   * Intenta usar navigator.permissions.query({ name: 'camera' }).
   * Safari iOS no soporta este nombre de permiso y lanza TypeError.
   *
   * @returns `true` si la Permissions API funcionó; `false` si no está soportada.
   */
  private async checkCameraViaPermissionsApi(): Promise<boolean> {
    if (typeof navigator.permissions?.query !== 'function') return false;

    try {
      const status = await navigator.permissions.query({ name: 'camera' as PermissionName });
      this.setCameraFromPermissionState(status.state);
      this.registerCameraPermissionListener(status);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fallback: abre un stream de cámara brevemente para verificar el permiso.
   * Maneja todos los tipos de error posibles de `getUserMedia`.
   */
  private async checkCameraViaGetUserMedia(): Promise<void> {
    try {
      if (typeof navigator.mediaDevices?.getUserMedia !== 'function') {
        this._cameraPermission.set('unknown');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      stream.getTracks().forEach((track) => track.stop());
      this._cameraPermission.set('granted');
    } catch (error: unknown) {
      this.handleGetUserMediaError(error);
    }
  }

  /**
   * Solicita activamente el permiso de cámara abriendo el stream.
   */
  private async requestCameraPermission(): Promise<void> {
    if (await this.checkCameraViaPermissionsApi()) {
      if (this._cameraPermission() === 'granted') return;
      if (this._cameraPermission() === 'denied') return;
    }
    await this.checkCameraViaGetUserMedia();
  }

  /**
   * Clasifica errores de `getUserMedia` y actualiza el signal de cámara.
   */
  private handleGetUserMediaError(error: unknown): void {
    const err = error as { name?: string };

    switch (err.name) {
      case 'NotAllowedError':
        this._cameraPermission.set('denied');
        this.logger.warn('Permiso de cámara denegado');
        break;

      case 'NotFoundError':
        this._cameraPermission.set('denied');
        this.logger.warn('Cámara no encontrada en el dispositivo');
        break;

      case 'NotReadableError':
        this._cameraPermission.set('granted');
        this.logger.warn('Cámara ocupada por otra app, pero el permiso sí está concedido');
        break;

      case 'OverconstrainedError':
        this._cameraPermission.set('granted');
        this.logger.warn(
          'Restricciones de video no satisfechas, pero el permiso sí está concedido',
        );
        break;

      default:
        this._cameraPermission.set('unknown');
        this.logger.warn('Error inesperado al verificar permiso de cámara:', error);
        break;
    }
  }

  /**
   * Convierte un `PermissionState` del navegador al tipo interno `PermissionState`.
   */
  private setCameraFromPermissionState(state: globalThis.PermissionState): void {
    switch (state) {
      case 'granted':
        this._cameraPermission.set('granted');
        break;
      case 'denied':
        this._cameraPermission.set('denied');
        break;
      case 'prompt':
        this._cameraPermission.set('prompt');
        break;
    }
  }

  /**
   * Registra un listener `onchange` en el PermissionStatus de cámara
   * para detectar cambios desde Ajustes del navegador.
   */
  private registerCameraPermissionListener(status: PermissionStatus): void {
    this.removeCameraPermissionListener();
    this.cameraPermissionStatus = status;

    status.onchange = (): void => {
      this.setCameraFromPermissionState(status.state);
      this.logger.info(`Permiso de cámara cambió a: ${status.state}`);
    };

    this.destroyRef.onDestroy((): void => this.removeCameraPermissionListener());
  }

  private removeCameraPermissionListener(): void {
    if (this.cameraPermissionStatus) {
      this.cameraPermissionStatus.onchange = null;
      this.cameraPermissionStatus = null;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Ubicación
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Verifica el estado del permiso de ubicación usando la Permissions API
   * y, si es `prompt` o `granted`, confirma con `getCurrentPosition`.
   */
  private async checkLocationPermission(): Promise<void> {
    if (typeof navigator.geolocation === 'undefined') {
      this._locationPermission.set('denied');
      this.logger.warn('API de geolocalización no disponible');
      return;
    }

    const apiState = await this.checkLocationViaPermissionsApi();

    if (apiState === 'denied') {
      this._locationPermission.set('denied');
      return;
    }

    if (apiState === 'granted') {
      this._locationPermission.set('granted');
      return;
    }

    await this.checkLocationViaGetCurrentPosition();
  }

  /**
   * Consulta el estado del permiso de geolocalización vía Permissions API.
   *
   * @returns El estado del permiso o `null` si la API no está disponible.
   */
  private async checkLocationViaPermissionsApi(): Promise<PermissionState | null> {
    if (typeof navigator.permissions?.query !== 'function') return null;

    try {
      const status = await navigator.permissions.query({
        name: 'geolocation' as PermissionName,
      });

      this.registerLocationPermissionListener(status);

      switch (status.state) {
        case 'granted':
          return 'granted';
        case 'denied':
          return 'denied';
        case 'prompt':
          return 'prompt';
      }
    } catch {
      return null;
    }

    return null;
  }

  /**
   * Confirma el permiso de ubicación solicitando la posición actual.
   */
  private async checkLocationViaGetCurrentPosition(): Promise<void> {
    try {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => {
            this._locationPermission.set('granted');
            resolve();
          },
          (geoError) => {
            if (geoError.code === geoError.PERMISSION_DENIED) {
              this._locationPermission.set('denied');
              this.logger.warn('Permiso de ubicación denegado');
            } else if (geoError.code === geoError.TIMEOUT) {
              this._locationPermission.set('granted');
              this.logger.warn(
                'Timeout al obtener ubicación, pero el permiso probablemente está concedido',
              );
            } else {
              this._locationPermission.set('unknown');
              this.logger.warn('Error al obtener ubicación:', geoError);
            }
            resolve();
          },
          { timeout: GEOLOCATION_TIMEOUT_MS, enableHighAccuracy: false },
        );
      });
    } catch (error) {
      this._locationPermission.set('unknown');
      this.logger.warn('Error inesperado al verificar ubicación:', error);
    }
  }

  /**
   * Solicita activamente el permiso de ubicación.
   */
  private async requestLocationPermission(): Promise<void> {
    if (typeof navigator.geolocation === 'undefined') {
      this._locationPermission.set('denied');
      return;
    }

    await this.checkLocationViaGetCurrentPosition();
  }

  /**
   * Registra un listener `onchange` en el PermissionStatus de geolocalización.
   */
  private registerLocationPermissionListener(status: PermissionStatus): void {
    this.removeLocationPermissionListener();
    this.locationPermissionStatus = status;

    status.onchange = (): void => {
      this.setLocationFromPermissionState(status.state);
      this.logger.info(`Permiso de ubicación cambió a: ${status.state}`);
    };

    this.destroyRef.onDestroy((): void => this.removeLocationPermissionListener());
  }

  private removeLocationPermissionListener(): void {
    if (this.locationPermissionStatus) {
      this.locationPermissionStatus.onchange = null;
      this.locationPermissionStatus = null;
    }
  }

  private setLocationFromPermissionState(state: globalThis.PermissionState): void {
    switch (state) {
      case 'granted':
        this._locationPermission.set('granted');
        break;
      case 'denied':
        this._locationPermission.set('denied');
        break;
      case 'prompt':
        this._locationPermission.set('prompt');
        break;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Visibilidad
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Registra un listener `visibilitychange` que re-verifica permisos
   * cuando el usuario regresa a la app (p. ej. después de ir a Ajustes).
   */
  private registerVisibilityListener(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.removeVisibilityListener();

    this.visibilityHandler = (): void => {
      if (document.visibilityState === 'visible') {
        void this.recheckPermissionsSilently();
      }
    };

    document.addEventListener('visibilitychange', this.visibilityHandler);
    this.destroyRef.onDestroy((): void => this.removeVisibilityListener());
  }

  private removeVisibilityListener(): void {
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  /**
   * Re-verifica permisos silenciosamente (sin abrir diálogos de solicitud).
   * Solo consulta la Permissions API si está disponible; no abre getUserMedia.
   */
  private async recheckPermissionsSilently(): Promise<void> {
    if (this.cameraPermissionStatus) {
      this.setCameraFromPermissionState(this.cameraPermissionStatus.state);
    }

    if (this.locationPermissionStatus) {
      this.setLocationFromPermissionState(this.locationPermissionStatus.state);
    } else {
      await this.checkLocationPermission();
    }

    if (!this.cameraPermissionStatus) {
      await this.checkCameraPermission();
    }
  }
}
