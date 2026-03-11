import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { IDeviceInfo } from '@core/interfaces/device-info.interface';

@Injectable({
  providedIn: 'root',
})
export class DeviceDetectionService {
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Obtiene información completa del dispositivo y plataforma
   * @returns Información del dispositivo
   */
  getDeviceInfo(): IDeviceInfo {
    if (!isPlatformBrowser(this.platformId)) {
      return {
        deviceType: 'desktop',
        os: 'Unknown',
        osVersion: '',
        browser: 'Unknown',
        isPwa: false,
        userAgent: '',
      };
    }

    const userAgent = navigator.userAgent;

    return {
      deviceType: this.detectDeviceType(userAgent),
      os: this.detectOS(userAgent),
      osVersion: this.detectOSVersion(userAgent),
      browser: this.detectBrowser(userAgent),
      isPwa: this.detectPWA(),
      userAgent,
    };
  }

  /**
   * Detecta el tipo de dispositivo basándose en el user agent
   */
  private detectDeviceType(userAgent: string): 'mobile' | 'tablet' | 'desktop' {
    // Detectar tablets primero
    if (
      /iPad/.test(userAgent) ||
      (/Android/.test(userAgent) && !/Mobile/.test(userAgent)) ||
      /Tablet/.test(userAgent)
    ) {
      return 'tablet';
    }

    // Detectar móviles
    if (/Android.*Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
      return 'mobile';
    }

    // Por defecto, escritorio
    return 'desktop';
  }

  /**
   * Detecta el sistema operativo
   */
  private detectOS(userAgent: string): string {
    if (/Windows NT 10.0/.test(userAgent)) return 'Windows 10';
    if (/Windows NT 11.0/.test(userAgent)) return 'Windows 11';
    if (/Windows NT 6.3/.test(userAgent)) return 'Windows 8.1';
    if (/Windows NT 6.2/.test(userAgent)) return 'Windows 8';
    if (/Windows NT 6.1/.test(userAgent)) return 'Windows 7';
    if (/Windows/.test(userAgent)) return 'Windows';

    if (/Mac OS X/.test(userAgent)) {
      const version = this.detectOSVersion(userAgent);
      return version ? `macOS ${version}` : 'macOS';
    }

    if (/iPhone/.test(userAgent)) return 'iOS';
    if (/iPad/.test(userAgent)) return 'iPadOS';
    if (/iPod/.test(userAgent)) return 'iOS';

    if (/Android/.test(userAgent)) return 'Android';

    if (/Linux/.test(userAgent)) return 'Linux';
    if (/CrOS/.test(userAgent)) return 'Chrome OS';

    return 'Unknown';
  }

  /**
   * Detecta la versión del sistema operativo
   */
  private detectOSVersion(userAgent: string): string {
    // iOS/iPadOS
    const iosMatch = userAgent.match(/OS (\d+)[_.](\d+)[_.]?(\d+)?/);
    if (iosMatch) {
      return `${iosMatch[1]}.${iosMatch[2]}${iosMatch[3] ? '.' + iosMatch[3] : ''}`;
    }

    // Android
    const androidMatch = userAgent.match(/Android (\d+\.?\d*\.?\d*)/);
    if (androidMatch) {
      return androidMatch[1];
    }

    // macOS
    const macMatch = userAgent.match(/Mac OS X (\d+)[_.](\d+)[_.]?(\d+)?/);
    if (macMatch) {
      return `${macMatch[1]}.${macMatch[2]}${macMatch[3] ? '.' + macMatch[3] : ''}`;
    }

    // Windows
    const winMatch = userAgent.match(/Windows NT (\d+\.\d+)/);
    if (winMatch) {
      return winMatch[1];
    }

    return '';
  }

  /**
   * Detecta el navegador
   */
  private detectBrowser(userAgent: string): string {
    // Edge (debe estar antes de Chrome)
    if (/Edg\//.test(userAgent)) return 'Edge';

    // Chrome
    if (/Chrome\//.test(userAgent) && !/Edg\//.test(userAgent)) return 'Chrome';

    // Safari (debe estar después de Chrome)
    if (/Safari\//.test(userAgent) && !/Chrome\//.test(userAgent)) return 'Safari';

    // Firefox
    if (/Firefox\//.test(userAgent)) return 'Firefox';

    // Opera
    if (/OPR\//.test(userAgent) || /Opera\//.test(userAgent)) return 'Opera';

    // Internet Explorer
    if (/MSIE |Trident\//.test(userAgent)) return 'Internet Explorer';

    return 'Unknown';
  }

  /**
   * Detecta si la app está corriendo como PWA instalada
   */
  private detectPWA(): boolean {
    // iOS standalone
    if ((window.navigator as { standalone?: boolean }).standalone === true) {
      return true;
    }

    // Display mode standalone/fullscreen/minimal-ui
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: fullscreen)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches
    ) {
      return true;
    }

    // TWA (Trusted Web Activity)
    if (document.referrer.includes('android-app://') || document.referrer.includes('ios-app://')) {
      return true;
    }

    return false;
  }

  /**
   * Obtiene un texto descriptivo del tipo de dispositivo
   */
  getDeviceTypeLabel(): string {
    const deviceType = this.detectDeviceType(navigator.userAgent);
    switch (deviceType) {
      case 'mobile':
        return 'Móvil';
      case 'tablet':
        return 'Tablet';
      case 'desktop':
        return 'Escritorio';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Obtiene un texto descriptivo del modo de acceso
   */
  getAccessModeLabel(): string {
    return this.detectPWA() ? 'PWA Instalada' : 'Navegador';
  }

  /**
   * Obtiene una descripción completa del dispositivo
   */
  getDeviceDescription(): string {
    const info = this.getDeviceInfo();
    const parts: string[] = [];

    // Modo de acceso
    parts.push(info.isPwa ? 'PWA' : 'Navegador');

    // Tipo de dispositivo
    parts.push(this.getDeviceTypeLabel());

    // Sistema operativo
    if (info.os !== 'Unknown') {
      parts.push(info.osVersion ? `${info.os} ${info.osVersion}` : info.os);
    }

    return parts.join(' • ');
  }
}
