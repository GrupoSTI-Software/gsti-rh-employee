import { inject, Injectable } from '@angular/core';
import { EXCEPTION_PORT } from '../domain/exception.token';
import { IExceptionPort } from '../domain/entities/exception-port.interface';
import { IExceptionRequestDetail } from '../domain/entities/exception-request-detail.interface';
import { LoggerService } from '@core/services/logger.service';

/**
 * Caso de uso para obtener las solicitudes de excepción del empleado
 */
@Injectable({
  providedIn: 'root',
})
export class GetExceptionRequestsUseCase {
  private readonly exceptionPort = inject<IExceptionPort>(EXCEPTION_PORT);
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para obtener solicitudes de excepción
   */
  async execute(
    employeeId: number,
    searchText?: string,
    departmentId?: number,
    positionId?: number,
    status?: string,
    page?: number,
    limit?: number,
  ): Promise<IExceptionRequestDetail[]> {
    try {
      return await this.exceptionPort.getExceptionRequests(
        employeeId,
        searchText,
        departmentId,
        positionId,
        status,
        page,
        limit,
      );
    } catch (error) {
      this.logger.error('Error al obtener solicitudes de excepción:', error);
      return [];
    }
  }
}
