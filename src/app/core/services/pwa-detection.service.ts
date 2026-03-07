import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Clave de localStorage para persistir el estado PWA entre sesiones.
 * Necesario porque en Android el display-mode puede no estar disponible
 * de forma inmediata al lanzar la app desde el ícono de inicio.
 */
const PWA_STANDALONE_PERSISTED_KEY = 'pwa_standalone_confirmed';

/**
 * Tiempo máximo de espera (ms) para que display-mode se propague en Android.
 */
const DISPLAY_MODE_WAIT_MS = 300;

@Injectable({
  providedIn: 'root',
})
export class PwaDetectionService {
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.persistStandaloneStateIfDetected();
      this.setupStandaloneListeners();
    }
  }

  /**
   * Persiste en localStorage cuando se detecta modo standalone real.
   * Esto resuelve el problema de timing en Android donde display-mode
   * puede no estar disponible inmediatamente al lanzar la PWA.
   */
  private persistStandaloneStateIfDetected(): void {
    if (this.checkDisplayModeStandalone() || this.checkIOSStandalone() || this.checkNativeApp()) {
      this.persistStandaloneState();
    }
  }

  /**
   * Configura listeners reactivos para detectar cambios en el modo standalone.
   * Cubre dos escenarios críticos:
   * 1. El display-mode cambia después de que el constructor ya ejecutó la verificación inicial
   * 2. El evento appinstalled confirma que la PWA fue instalada desde el navegador
   */
  private setupStandaloneListeners(): void {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    standaloneQuery.addEventListener('change', (e) => {
      if (e.matches) {
        this.persistStandaloneState();
      }
    });

    const fullscreenQuery = window.matchMedia('(display-mode: fullscreen)');
    fullscreenQuery.addEventListener('change', (e) => {
      if (e.matches) {
        this.persistStandaloneState();
      }
    });

    window.addEventListener('appinstalled', () => {
      this.persistStandaloneState();
    });
  }

  /**
   * Guarda la confirmación de modo standalone en localStorage.
   */
  private persistStandaloneState(): void {
    try {
      localStorage.setItem(PWA_STANDALONE_PERSISTED_KEY, 'true');
    } catch {
      // Ignorar errores de localStorage (modo privado, cuota excedida, etc.)
    }
  }

  /**
   * Verifica display-mode standalone o fullscreen vía media query.
   */
  private checkDisplayModeStandalone(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches
    );
  }

  /**
   * Verifica navigator.standalone para iOS Safari.
   */
  private checkIOSStandalone(): boolean {
    return (window.navigator as { standalone?: boolean }).standalone === true;
  }

  /**
   * Verifica si fue abierta desde una app nativa (TWA).
   */
  private checkNativeApp(): boolean {
    return document.referrer.includes('android-app://') || document.referrer.includes('ios-app://');
  }

  /**
   * Verifica si la aplicación está corriendo en modo PWA (standalone).
   * Combina detección en tiempo real con el estado persistido en localStorage
   * para resolver el problema de timing en Android al lanzar la app instalada.
   * @returns true si está en modo PWA instalada, false en caso contrario
   */
  isRunningAsPwa(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    return (
      this.checkDisplayModeStandalone() ||
      this.checkIOSStandalone() ||
      this.checkNativeApp() ||
      this.getPersistedStandaloneState()
    );
  }

  /**
   * Verificación asíncrona de modo PWA con espera para Android.
   * En Android Chrome, el display-mode puede tardar unos milisegundos en
   * propagarse al iniciar la PWA desde el ícono de inicio.
   * Este método espera brevemente antes de dar un resultado negativo.
   * @returns Promesa que resuelve a true si está en modo PWA
   */
  async isRunningAsPwaAsync(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    if (this.isRunningAsPwa()) {
      return true;
    }

    // En Android, esperar a que display-mode se propague
    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!isAndroid) {
      return false;
    }

    return new Promise<boolean>((resolve) => {
      const mql = window.matchMedia('(display-mode: standalone)');

      const cleanup = (): void => {
        clearTimeout(timeout);
        mql.removeEventListener('change', handler);
      };

      const handler = (e: MediaQueryListEvent): void => {
        if (e.matches) {
          cleanup();
          this.persistStandaloneState();
          resolve(true);
        }
      };

      const timeout = setTimeout(() => {
        mql.removeEventListener('change', handler);
        // Último intento de detección tras el timeout
        resolve(this.isRunningAsPwa());
      }, DISPLAY_MODE_WAIT_MS);

      mql.addEventListener('change', handler);
    });
  }

  /**
   * Obtiene el estado standalone persistido en localStorage.
   * @returns true si se confirmó modo standalone en una sesión anterior
   */
  private getPersistedStandaloneState(): boolean {
    try {
      return localStorage.getItem(PWA_STANDALONE_PERSISTED_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Limpia el estado standalone persistido.
   * Llamar cuando se desinstala la PWA o se quiere forzar re-verificación.
   */
  clearPersistedStandaloneState(): void {
    try {
      localStorage.removeItem(PWA_STANDALONE_PERSISTED_KEY);
    } catch {
      // Ignorar errores de localStorage
    }
  }

  /**
   * Verifica si la aplicación puede instalarse como PWA
   * @returns true si puede instalarse, false en caso contrario
   */
  canInstallPwa(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    return 'serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window;
  }

  /**
   * Obtiene información detallada sobre el estado de PWA
   */
  getPwaInfo(): {
    isPwa: boolean;
    displayMode: string;
    isIOS: boolean;
    hasServiceWorker: boolean;
  } {
    if (!isPlatformBrowser(this.platformId)) {
      return {
        isPwa: false,
        displayMode: 'browser',
        isIOS: false,
        hasServiceWorker: false,
      };
    }

    const displayMode = window.matchMedia('(display-mode: standalone)').matches
      ? 'standalone'
      : window.matchMedia('(display-mode: fullscreen)').matches
        ? 'fullscreen'
        : window.matchMedia('(display-mode: minimal-ui)').matches
          ? 'minimal-ui'
          : 'browser';

    return {
      isPwa: this.isRunningAsPwa(),
      displayMode,
      isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
      hasServiceWorker: 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null,
    };
  }
}
