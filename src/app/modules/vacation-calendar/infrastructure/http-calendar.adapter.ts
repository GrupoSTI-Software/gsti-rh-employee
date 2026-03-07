import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ICalendarPort, IHoliday, IHolidaysApiResponse } from '../domain/vacation.port';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';
import { ApiErrorTranslatorService } from '@core/services/api-error-translator.service';

/**
 * Adaptador HTTP para calendario (festividades)
 * Implementa el puerto CalendarPort usando HTTP
 * Nota: El token de autenticación se agrega automáticamente mediante el interceptor
 */
@Injectable({
  providedIn: 'root',
})
export class HttpCalendarAdapter implements ICalendarPort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiErrorTranslator = inject(ApiErrorTranslatorService);
  private readonly apiUrl = environment.API_URL;

  /**
   * Obtiene las festividades en un rango de fechas
   */
  async getHolidays(
    firstDate: string,
    lastDate: string,
    page = 1,
    limit = 20,
  ): Promise<IHoliday[]> {
    try {
      const url = `${this.apiUrl}/holidays?search&firstDate=${firstDate}&lastDate=${lastDate}&page=${page}&limit=${limit}`;

      const response = await firstValueFrom<IHolidaysApiResponse>(
        this.http.get<IHolidaysApiResponse>(url),
      );

      return response.holidays?.data ?? [];
    } catch (error: unknown) {
      this.logger.error('Error al obtener festividades:', error);

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

      return [];
    }
  }
}
