import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IVacationsEmployeePort } from '../domain/entities/vacations-employee-port.interface';
import { IYearWorked } from '../domain/entities/year-worked.interface';
import { IYearsWorkedApiResponse } from '../domain/entities/years-worked-api-response.interface';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';
import { ApiErrorTranslatorService } from '@core/services/api-error-translator.service';

/**
 * Adaptador HTTP que implementa el puerto del módulo Vacaciones.
 * Consume la API GET /employees/:id/get-years-worked.
 * El token de autenticación se agrega mediante el interceptor.
 */
@Injectable({
  providedIn: 'root',
})
export class HttpVacationsEmployeeAdapter implements IVacationsEmployeePort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiErrorTranslator = inject(ApiErrorTranslatorService);
  private readonly apiUrl = environment.API_URL;

  /**
   * Obtiene los años trabajados y vacaciones del empleado.
   */
  async getYearsWorked(employeeId: number, year?: number): Promise<IYearWorked[]> {
    try {
      let url = `${this.apiUrl}/employees/${employeeId}/get-years-worked`;
      if (year != null) {
        url += `?year=${year}`;
      }

      const response = await firstValueFrom<IYearsWorkedApiResponse>(
        this.http.get<IYearsWorkedApiResponse>(url),
      );

      return response.data?.yearsWorked ?? [];
    } catch (error: unknown) {
      this.logger.error('Error al obtener años trabajados:', error);

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
