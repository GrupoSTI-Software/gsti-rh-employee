import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { IDeviceInfo } from '@modules/auth/domain/auth.port';
import { SecureStorageService } from './secure-storage.service';

/**
 * Clave para almacenar el token del dispositivo
 */
const DEVICE_TOKEN_KEY = 'device_token';

/**
 * Servicio para obtener información del dispositivo
 */
@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly secureStorage = inject(SecureStorageService);

  /**
   * Obtiene o genera un token único del dispositivo
   */
  getOrCreateDeviceToken(): string {
    if (!isPlatformBrowser(this.platformId)) {
      const token = this.generateUUID();
      this.secureStorage.setItem(DEVICE_TOKEN_KEY, token);
      return token;
    }
    let token = this.secureStorage.getItem(DEVICE_TOKEN_KEY);

    if (token === null || token.length === 0) {
      token = this.generateUUID();
    }
    this.secureStorage.setItem(DEVICE_TOKEN_KEY, token);
    return token;
  }

  /**
   * Obtiene la información completa del dispositivo
   */
  getDeviceInfo(): IDeviceInfo {
    if (!isPlatformBrowser(this.platformId)) {
      return {
        deviceBrand: null,
        deviceModel: 'Unknown',
        deviceOs: 'Unknown',
        deviceType: null,
        deviceToken: '',
      };
    }

    const userAgent = navigator.userAgent;
    const platform = navigator.platform;

    return {
      deviceBrand: this.getDeviceBrand(userAgent),
      deviceModel: this.getDeviceModel(platform, userAgent),
      deviceOs: this.getDeviceOs(platform, userAgent),
      deviceType: this.getDeviceType(userAgent),
      deviceToken: this.getOrCreateDeviceToken(),
    };
  }

  /**
   * Genera un UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Obtiene la marca del dispositivo
   */
  private getDeviceBrand(userAgent: string): string | null {
    // Detectar marca del dispositivo desde userAgent
    if (/iPhone/i.test(userAgent)) return 'Apple';
    if (/iPad/i.test(userAgent)) return 'Apple';
    if (/Macintosh/i.test(userAgent)) return 'Apple';
    if (/Android/i.test(userAgent)) {
      // Intentar extraer la marca del dispositivo Android
      const match = userAgent.match(/Android.*?; ([^)]+)\)/);
      if (match?.[1] !== undefined) {
        return match[1].split(' ')[0];
      }
      return 'Android';
    }
    if (/Windows/i.test(userAgent)) return 'Microsoft';
    if (/Linux/i.test(userAgent)) return 'Linux';
    return null;
  }

  /**
   * Obtiene el modelo del dispositivo
   */
  private getDeviceModel(platform: string, userAgent: string): string {
    // Para Mac, usar platform directamente
    if (/Macintosh/i.test(platform)) {
      return platform;
    }

    // Para iPhone/iPad
    if (/iPhone/i.test(userAgent)) {
      const match = userAgent.match(/iPhone(\d+,\d+)/);
      if (match) return `iPhone ${match[1]}`;
      return 'iPhone';
    }

    if (/iPad/i.test(userAgent)) {
      const match = userAgent.match(/iPad/i);
      if (match) return 'iPad';
    }

    // Para Android
    if (/Android/i.test(userAgent)) {
      const match = userAgent.match(/Android.*?; ([^)]+)\)/);
      if (match?.[1] !== undefined) {
        return match[1];
      }
      return 'Android Device';
    }

    // Para Windows
    if (/Windows/i.test(userAgent)) {
      const match = userAgent.match(/Windows NT ([0-9.]+)/);
      if (match) {
        const version = match[1];
        const versionMap: Record<string, string> = {
          '10.0': 'Windows 10',
          '11.0': 'Windows 11',
          '6.3': 'Windows 8.1',
          '6.2': 'Windows 8',
          '6.1': 'Windows 7',
        };
        return versionMap[version] || `Windows ${version}`;
      }
      return platform;
    }

    return platform || 'Unknown';
  }

  /**
   * Obtiene el sistema operativo
   */
  private getDeviceOs(platform: string, userAgent: string): string {
    // Mac OS
    if (/Macintosh/i.test(userAgent)) {
      const match = userAgent.match(/Mac OS X ([0-9_]+)/);
      if (match) {
        const version = match[1].replace(/_/g, '.');
        return `Mac OS ${version}`;
      }
      return 'Mac OS';
    }

    // iOS
    if (/iPhone|iPad|iPod/i.test(userAgent)) {
      const match = userAgent.match(/OS ([0-9_]+)/);
      if (match) {
        const version = match[1].replace(/_/g, '.');
        return `iOS ${version}`;
      }
      return 'iOS';
    }

    // Android
    if (/Android/i.test(userAgent)) {
      const match = userAgent.match(/Android ([0-9.]+)/);
      if (match) {
        return `Android ${match[1]}`;
      }
      return 'Android';
    }

    // Windows
    if (/Windows/i.test(userAgent)) {
      const match = userAgent.match(/Windows NT ([0-9.]+)/);
      if (match) {
        const version = match[1];
        const versionMap: Record<string, string> = {
          '10.0': 'Windows 10',
          '11.0': 'Windows 11',
          '6.3': 'Windows 8.1',
          '6.2': 'Windows 8',
          '6.1': 'Windows 7',
        };
        return versionMap[version] || `Windows ${version}`;
      }
      return 'Windows';
    }

    // Linux
    if (/Linux/i.test(userAgent)) {
      return 'Linux';
    }

    return platform || 'Unknown';
  }

  /**
   * Obtiene el tipo de dispositivo
   */
  private getDeviceType(userAgent: string): string | null {
    if (/Mobile|Android|iPhone|iPad/i.test(userAgent)) {
      return 'mobile';
    }
    if (/Tablet|iPad/i.test(userAgent)) {
      return 'tablet';
    }
    if (/Desktop|Windows|Macintosh|Linux/i.test(userAgent)) {
      return 'desktop';
    }
    return null;
  }
}
