import { inject, Injectable } from '@angular/core';
import { EXCEPTION_PORT } from '../domain/exception.token';
import { IExceptionPort } from '../domain/entities/exception-port.interface';
import {
  IExceptionRequest,
  IExceptionRequestResponse,
} from '../domain/entities/exception-request.interface';
import { LoggerService } from '@core/services/logger.service';

/**
 * Caso de uso para crear solicitudes de excepción
 */
@Injectable({
  providedIn: 'root',
})
export class CreateExceptionRequestUseCase {
  private readonly exceptionPort = inject<IExceptionPort>(EXCEPTION_PORT);
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para crear una solicitud de excepción
   */
  async execute(request: IExceptionRequest): Promise<IExceptionRequestResponse> {
    try {
      return await this.exceptionPort.createExceptionRequest(request);
    } catch (error) {
      this.logger.error('Error al crear solicitud de excepción:', error);
      throw error;
    }
  }
}
