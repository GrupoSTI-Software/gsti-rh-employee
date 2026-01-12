import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ISystemSettingsPort,
  ISystemSettingsApiResponse,
  ISystemSettings,
} from '../domain/system-settings.port';
import { environment } from '@env/environment';

/**
 * Adaptador HTTP para configuraciones del sistema
 * Implementa el puerto SystemSettingsPort usando HTTP
 */
@Injectable({
  providedIn: 'root',
})
export class HttpSystemSettingsAdapter implements ISystemSettingsPort {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = environment.apiUrl;

  /**
   * Obtiene las configuraciones activas del sistema desde la API
   * @returns Promise con las configuraciones del sistema o null si hay error
   */
  async getActiveSettings(): Promise<ISystemSettings | null> {
    try {
      const response = await firstValueFrom<ISystemSettingsApiResponse>(
        this.http.get<ISystemSettingsApiResponse>(`${this.apiUrl}/system-settings-active`),
      );

      if (response?.data?.systemSetting !== null && response?.data?.systemSetting !== undefined) {
        return response.data.systemSetting;
      }

      return null;
    } catch (error: unknown) {
      console.error('Error al obtener configuraciones del sistema:', error);
      return null;
    }
  }
}
