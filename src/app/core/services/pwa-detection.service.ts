import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Clave de localStorage para persistir el estado PWA entre sesiones.
 * Necesario porque en Android el display-mode puede no estar disponible
 * de forma inmediata al lanzar la app desde el ícono de inicio.
 */
const PWA_STANDALONE_PERSISTED_KEY = 'pwa_standalone_confirmed';

@Injectable({
  providedIn: 'root',
})
export class PwaDetectionService {
  private readonly platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.persistStandaloneStateIfDetected();
    }
  }

  /**
   * Persiste en localStorage cuando se detecta modo standalone real.
   * Esto resuelve el problema de timing en Android donde display-mode
   * puede no estar disponible inmediatamente al lanzar la PWA.
   */
  private persistStandaloneStateIfDetected(): void {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as { standalone?: boolean }).standalone === true;
    const isFromNativeApp =
      document.referrer.includes('android-app://') || document.referrer.includes('ios-app://');

    if (isStandalone || isIOSStandalone || isFromNativeApp) {
      try {
        localStorage.setItem(PWA_STANDALONE_PERSISTED_KEY, 'true');
      } catch {
        // Ignorar errores de localStorage (modo privado, cuota excedida, etc.)
      }
    }
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

    // Método 1: Verificar display-mode standalone (estándar para Chrome, Edge, etc.)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Método 2: Verificar navigator.standalone (iOS Safari)
    const isIOSStandalone = (window.navigator as { standalone?: boolean }).standalone === true;

    // Método 3: Verificar si fue abierta desde una app nativa (TWA)
    const isFromNativeApp =
      document.referrer.includes('android-app://') || document.referrer.includes('ios-app://');

    // Método 4: Verificar estado persistido en localStorage.
    // En Android, al lanzar la PWA desde el ícono, el display-mode puede tardar
    // en propagarse. Si en una sesión anterior se confirmó el modo standalone,
    // confiamos en ese estado para evitar mostrar la pantalla de instalación.
    const isPersistedStandalone = this.getPersistedStandaloneState();

    return isStandalone || isIOSStandalone || isFromNativeApp || isPersistedStandalone;
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
