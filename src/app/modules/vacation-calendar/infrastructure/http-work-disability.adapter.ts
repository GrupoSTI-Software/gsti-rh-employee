import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IWorkDisabilityPort } from '../domain/entities/work-disability-port.interface';
import { IWorkDisability } from '../domain/entities/work-disability.interface';
import { IWorkDisabilitiesApiResponse } from '../domain/entities/work-disabilities-api-response.interface';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';

/**
 * Adaptador HTTP para incapacidades laborales
 * Implementa el puerto WorkDisabilityPort usando HTTP
 * Nota: El token de autenticación se agrega automáticamente mediante el interceptor
 */
@Injectable({
  providedIn: 'root',
})
export class HttpWorkDisabilityAdapter implements IWorkDisabilityPort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiUrl = environment.API_URL;

  /**
   * Obtiene las incapacidades laborales del empleado
   */
  async getWorkDisabilities(employeeId: number): Promise<IWorkDisability[]> {
    try {
      const url = `${this.apiUrl}/work-disabilities/employee/${employeeId}`;

      const response = await firstValueFrom<IWorkDisabilitiesApiResponse>(
        this.http.get<IWorkDisabilitiesApiResponse>(url),
      );

      return response.data?.workDisabilities ?? [];
    } catch (error: unknown) {
      this.logger.error('Error al obtener incapacidades laborales:', error);
      return [];
    }
  }
}
