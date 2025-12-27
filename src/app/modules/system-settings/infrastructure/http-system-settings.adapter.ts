import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SystemSettingsPort, SystemSettingsApiResponse } from '../domain/system-settings.port';
import { environment } from '@env/environment';

/**
 * Adaptador HTTP para configuraciones del sistema
 * Implementa el puerto SystemSettingsPort usando HTTP
 */
@Injectable({
  providedIn: 'root'
})
export class HttpSystemSettingsAdapter implements SystemSettingsPort {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Obtiene las configuraciones activas del sistema desde la API
   * @returns Promise con las configuraciones del sistema o null si hay error
   */
  async getActiveSettings() {
    try {
      const response = await firstValueFrom<SystemSettingsApiResponse>(
        this.http.get<SystemSettingsApiResponse>(
          `${this.apiUrl}/system-settings-active`
        )
      );

      if (response?.data?.systemSetting) {
        return response.data.systemSetting;
      }

      return null;
    } catch (error: unknown) {
      console.error('Error al obtener configuraciones del sistema:', error);
      return null;
    }
  }
}

