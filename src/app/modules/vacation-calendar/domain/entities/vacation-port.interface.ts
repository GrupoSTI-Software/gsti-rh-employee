import { IYearWorked } from './year-worked.interface';

/**
 * Puerto para gestión de vacaciones
 */
export interface IVacationPort {
  /**
   * Obtiene los años trabajados y vacaciones del empleado
   * @param employeeId - ID del empleado
   * @param year - Año opcional para filtrar
   * @returns Lista de años trabajados con sus vacaciones
   */
  getYearsWorked(employeeId: number, year?: number): Promise<IYearWorked[]>;
}
