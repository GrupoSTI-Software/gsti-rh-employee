import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IZoneCoordinatesPort, IZoneCoordinatesApiResponse } from '../domain/zone-coordinates.port';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';
import { ApiErrorTranslatorService } from '@core/services/api-error-translator.service';

/**
 * Adaptador HTTP para coordenadas de las zonas permitidas para el empleado
 * Implementa el puerto ZoneCoordinatesPort usando HTTP
 */
@Injectable({
  providedIn: 'root',
})
export class HttpZoneCoordinatesAdapter implements IZoneCoordinatesPort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiErrorTranslator = inject(ApiErrorTranslatorService);
  private readonly apiUrl = environment.API_URL;

  /**
   * Obtiene las coordenadas de las zonas permitidas para el empleado desde la API
   * @param employeeId - ID del empleado
   * @returns Promise con las coordenadas de las zonas permitidas para el empleado o null si hay error
   */
  async getZoneCoordinates(employeeId: number): Promise<number[][][] | null> {
    try {
      const response = await firstValueFrom<IZoneCoordinatesApiResponse>(
        this.http.get<IZoneCoordinatesApiResponse>(`${this.apiUrl}/employees/${employeeId}/zones`),
      );

      if (response) {
        return response.data.coordinates as [];
      }
      return null;
    } catch (error: unknown) {
      this.logger.error(
        'Error al obtener coordenadas de las zonas permitidas para el empleado:',
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
