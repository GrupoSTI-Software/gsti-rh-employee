import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';
import { ApiErrorTranslatorService } from '@core/services/api-error-translator.service';
import { IAuthorizeAnyZoneApiResponse } from '../domain/entities/authorize-any-zone-api-response.interface';
import { IAuthorizeAnyZonePort } from '../domain/entities/authorize-any-zone-port.interface';

/**
 * Adaptador HTTP para obtener si el empleado tiene permiso para registrar asistencia en cualquier zona
 * Implementa el puerto ZoneCoordinatesPort usando HTTP
 */
@Injectable({
  providedIn: 'root',
})
export class HttpAuthorizeAnyZoneAdapter implements IAuthorizeAnyZonePort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiErrorTranslator = inject(ApiErrorTranslatorService);
  private readonly apiUrl = environment.API_URL;

  /**
   * Obtiene si el empleado tiene permiso para registrar asistencia en cualquier zona desde la API
   * @param employeeId - ID del empleado
   * @returns Promise con si el empleado tiene permiso para registrar asistencia en cualquier zona o null si hay error
   */
  async getAuthorizeAnyZone(employeeId: number): Promise<boolean | null> {
    try {
      const response = await firstValueFrom<IAuthorizeAnyZoneApiResponse>(
        this.http.get<IAuthorizeAnyZoneApiResponse>(`${this.apiUrl}/employees/${employeeId}`),
      );
      if (response) {
        return response.data.employee.employeeAuthorizeAnyZones === 1 ? true : false;
      }
      return null;
    } catch (error: unknown) {
      this.logger.error(
        'Error al obtener si el empleado tiene permiso para registrar asistencia en cualquier zona:',
        error,
      );

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
