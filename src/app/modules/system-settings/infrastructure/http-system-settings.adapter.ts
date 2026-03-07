import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ISystemSettingsPort,
  ISystemSettingsApiResponse,
  ISystemSettings,
} from '../domain/system-settings.port';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';
import { ApiErrorTranslatorService } from '@core/services/api-error-translator.service';

/**
 * Adaptador HTTP para configuraciones del sistema
 * Implementa el puerto SystemSettingsPort usando HTTP
 */
@Injectable({
  providedIn: 'root',
})
export class HttpSystemSettingsAdapter implements ISystemSettingsPort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiErrorTranslator = inject(ApiErrorTranslatorService);
  private readonly apiUrl = environment.API_URL;

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
      this.logger.error('Error al obtener configuraciones del sistema:', error);

      // Traducir el mensaje de error si es posible
      if (error instanceof HttpErrorResponse) {
        const errorBody = error.error as { message?: string } | null;
        if (errorBody?.message !== undefined) {
          this.logger.error(
            'Mensaje del API:',
            this.apiErrorTranslator.translateError(errorBody.message),
          );
        }
      }

      return null;
    }
  }
}
