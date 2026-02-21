import { inject, Injectable } from '@angular/core';
import { VACATIONS_EMPLOYEE_PORT } from '../domain/vacations-employee.token';
import { IVacationsEmployeePort } from '../domain/entities/vacations-employee-port.interface';
import { IYearWorked } from '../domain/entities/year-worked.interface';
import { LoggerService } from '@core/services/logger.service';

/**
 * Caso de uso: obtener años trabajados y vacaciones del empleado.
 * Depende del puerto (domain); la infraestructura inyecta el adaptador.
 */
@Injectable({
  providedIn: 'root',
})
export class GetYearsWorkedUseCase {
  private readonly vacationsEmployeePort = inject<IVacationsEmployeePort>(VACATIONS_EMPLOYEE_PORT);
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para obtener años trabajados.
   *
   * @param employeeId - ID del empleado
   * @param year - Año opcional para filtrar
   * @returns Lista de años trabajados con sus vacaciones
   */
  async execute(employeeId: number, year?: number): Promise<IYearWorked[]> {
    try {
      return await this.vacationsEmployeePort.getYearsWorked(employeeId, year);
    } catch (error) {
      this.logger.error('Error al obtener años trabajados:', error);
      return [];
    }
  }
}
