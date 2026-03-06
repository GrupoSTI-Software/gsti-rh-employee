import { Injectable, signal, inject, PLATFORM_ID, NgZone } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Servicio para monitorear el estado de la conexión a internet.
 * Usa NgZone para garantizar que los cambios de estado disparen
 * la detección de cambios de Angular correctamente.
 */
@Injectable({
  providedIn: 'root',
})
export class ConnectionService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly ngZone = inject(NgZone);

  /**
   * Signal que indica si hay conexión a internet
   */
  readonly isOnline = signal<boolean>(true);

  /**
   * Signal que indica si se está mostrando el overlay de sin conexión
   */
  readonly showOverlay = signal<boolean>(false);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeConnectionMonitoring();
    }
  }

  /**
   * Inicializa el monitoreo de la conexión a internet escuchando
   * los eventos nativos del navegador dentro de NgZone para que
   * Angular detecte los cambios de estado.
   */
  private initializeConnectionMonitoring(): void {
    const isConnected = navigator.onLine;
    this.isOnline.set(isConnected);
    this.showOverlay.set(!isConnected);

    // Los eventos del navegador ocurren fuera de la zona de Angular,
    // por eso usamos ngZone.run() para que los cambios en los signals
    // disparen la detección de cambios y el template se actualice.
    window.addEventListener('online', () => {
      this.ngZone.run(() => {
        this.isOnline.set(true);
        this.showOverlay.set(false);
      });
    });

    window.addEventListener('offline', () => {
      this.ngZone.run(() => {
        this.isOnline.set(false);
        this.showOverlay.set(true);
      });
    });
  }

  /**
   * Verifica la conexión realizando una petición HTTP real al servidor.
   * Útil para detectar conexiones cautivas o sin acceso real a internet.
   */
  async checkConnection(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }

    try {
      const response = await fetch(`/assets/i18n/es.json?t=${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-cache',
      });

      const isConnected = response.ok;
      this.ngZone.run(() => {
        this.isOnline.set(isConnected);
        this.showOverlay.set(!isConnected);
      });

      return isConnected;
    } catch {
      this.ngZone.run(() => {
        this.isOnline.set(false);
        this.showOverlay.set(true);
      });
      return false;
    }
  }

  /**
   * Oculta manualmente el overlay
   */
  hideOverlay(): void {
    this.showOverlay.set(false);
  }

  /**
   * Muestra manualmente el overlay
   */
  displayOverlay(): void {
    this.showOverlay.set(true);
  }
}
