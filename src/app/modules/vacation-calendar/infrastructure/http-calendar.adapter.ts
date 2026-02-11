import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ICalendarPort, IHoliday, IHolidaysApiResponse } from '../domain/vacation.port';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';

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
      return [];
    }
  }
}
