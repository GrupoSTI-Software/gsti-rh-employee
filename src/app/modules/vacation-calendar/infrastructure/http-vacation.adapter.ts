import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IVacationPort, IYearWorked, IYearsWorkedApiResponse } from '../domain/vacation.port';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';

/**
 * Adaptador HTTP para vacaciones
 * Implementa el puerto VacationPort usando HTTP
 * Nota: El token de autenticación se agrega automáticamente mediante el interceptor
 */
@Injectable({
  providedIn: 'root',
})
export class HttpVacationAdapter implements IVacationPort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiUrl = environment.API_URL;

  /**
   * Obtiene los años trabajados y vacaciones del empleado
   */
  async getYearsWorked(employeeId: number): Promise<IYearWorked[]> {
    try {
      const url = `${this.apiUrl}/employees/${employeeId}/get-years-worked`;

      const response = await firstValueFrom<IYearsWorkedApiResponse>(
        this.http.get<IYearsWorkedApiResponse>(url),
      );

      return response.data?.yearsWorked ?? [];
    } catch (error: unknown) {
      this.logger.error('Error al obtener años trabajados:', error);
      return [];
    }
  }
}
