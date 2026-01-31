import { inject, Injectable } from '@angular/core';
import { EXCEPTION_PORT } from '../domain/exception.token';
import { IExceptionPort } from '../domain/entities/exception-port.interface';
import { IExceptionType } from '../domain/entities/exception-type.interface';
import { LoggerService } from '@core/services/logger.service';

/**
 * Caso de uso para obtener los tipos de excepción
 */
@Injectable({
  providedIn: 'root',
})
export class GetExceptionTypesUseCase {
  private readonly exceptionPort = inject<IExceptionPort>(EXCEPTION_PORT);
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para obtener tipos de excepción
   */
  async execute(
    search?: string,
    onlyActive?: boolean,
    page?: number,
    limit?: number,
  ): Promise<IExceptionType[]> {
    try {
      return await this.exceptionPort.getExceptionTypes(search, onlyActive, page, limit);
    } catch (error) {
      this.logger.error('Error al obtener tipos de excepción:', error);
      return [];
    }
  }
}
