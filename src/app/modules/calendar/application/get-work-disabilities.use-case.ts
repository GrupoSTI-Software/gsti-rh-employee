import { inject, Injectable } from '@angular/core';
import { WORK_DISABILITY_PORT } from '../domain/work-disability.token';
import { IWorkDisabilityPort } from '../domain/entities/work-disability-port.interface';
import { IWorkDisability } from '../domain/entities/work-disability.interface';
import { LoggerService } from '@core/services/logger.service';

/**
 * Caso de uso para obtener las incapacidades laborales del empleado
 */
@Injectable({
  providedIn: 'root',
})
export class GetWorkDisabilitiesUseCase {
  private readonly workDisabilityPort = inject<IWorkDisabilityPort>(WORK_DISABILITY_PORT);
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para obtener incapacidades laborales
   */
  async execute(employeeId: number): Promise<IWorkDisability[]> {
    try {
      return await this.workDisabilityPort.getWorkDisabilities(employeeId);
    } catch (error) {
      this.logger.error('Error al obtener incapacidades laborales:', error);
      return [];
    }
  }
}
