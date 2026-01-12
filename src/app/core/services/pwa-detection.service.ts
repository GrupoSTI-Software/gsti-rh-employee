import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class PwaDetectionService {
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Verifica si la aplicación está corriendo en modo PWA (standalone)
   * @returns true si está en modo PWA, false en caso contrario
   */
  isRunningAsPwa(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      // En SSR, siempre permitir (el guard verificará en el cliente)
      return true;
    }

    // Método 1: Verificar display-mode standalone (estándar)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Método 2: Verificar navigator.standalone (iOS Safari)
    const isIOSStandalone = (window.navigator as { standalone?: boolean }).standalone === true;

    // Método 3: Verificar si está instalada mediante referrer
    const isInstalled =
      window.matchMedia('(display-mode: standalone)').matches ||
      document.referrer.includes('android-app://') ||
      document.referrer.includes('ios-app://');

    // Método 4: Verificar si hay service worker activo
    const hasServiceWorker =
      'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;

    // Retornar true si cumple al menos uno de los criterios
    return isStandalone || isIOSStandalone || isInstalled || hasServiceWorker;
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
