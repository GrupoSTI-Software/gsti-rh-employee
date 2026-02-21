import { IYearWorked } from './year-worked.interface';

/**
 * Puerto para obtener años trabajados y vacaciones del empleado (módulo Vacaciones).
 * La capa de aplicación depende de este puerto; la infraestructura lo implementa.
 */
export interface IVacationsEmployeePort {
  /**
   * Obtiene los años trabajados y vacaciones del empleado.
   *
   * @param employeeId - ID del empleado
   * @param year - Año opcional para filtrar
   * @returns Lista de años trabajados con sus vacaciones
   */
  getYearsWorked(employeeId: number, year?: number): Promise<IYearWorked[]>;
}
