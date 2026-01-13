import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class PwaDetectionService {
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Verifica si la aplicación está corriendo en modo PWA (standalone)
   * Solo retorna true si la app fue instalada y está corriendo en modo standalone
   * @returns true si está en modo PWA instalada, false en caso contrario
   */
  isRunningAsPwa(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      // En SSR, retornar false para que el cliente verifique correctamente
      // después de la hidratación
      return false;
    }

    // Método 1: Verificar display-mode standalone (estándar para Chrome, Edge, etc.)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Método 2: Verificar navigator.standalone (iOS Safari)
    const isIOSStandalone = (window.navigator as { standalone?: boolean }).standalone === true;

    // Método 3: Verificar si fue abierta desde una app nativa (TWA)
    const isFromNativeApp =
      document.referrer.includes('android-app://') || document.referrer.includes('ios-app://');

    // Solo retornar true si está en modo standalone real (instalada como PWA)
    // NO incluir hasServiceWorker porque el SW puede estar activo en el navegador normal
    return isStandalone || isIOSStandalone || isFromNativeApp;
  }

  /**
   * Verifica si la aplicación puede instalarse como PWA
   * @returns true si puede instalarse, false en caso contrario
   */
  canInstallPwa(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    // Verificar si el navegador soporta instalación de PWA
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
