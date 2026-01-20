import { inject, Injectable } from '@angular/core';
import { VACATION_PORT } from '../domain/vacation.token';
import { IVacationPort, IYearWorked } from '../domain/vacation.port';
import { LoggerService } from '@core/services/logger.service';

/**
 * Caso de uso para obtener los años trabajados y vacaciones del empleado
 */
@Injectable({
  providedIn: 'root',
})
export class GetYearsWorkedUseCase {
  private readonly vacationPort = inject<IVacationPort>(VACATION_PORT);
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para obtener años trabajados
   * @param employeeId - ID del empleado
   * @param year - Año opcional para filtrar
   * @returns Lista de años trabajados con sus vacaciones
   */
  async execute(employeeId: number, year?: number): Promise<IYearWorked[]> {
    try {
      return await this.vacationPort.getYearsWorked(employeeId, year);
    } catch (error) {
      this.logger.error('Error al obtener años trabajados:', error);
      return [];
    }
  }
}
