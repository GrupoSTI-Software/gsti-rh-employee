import { IWorkDisability } from './work-disability.interface';

/**
 * Puerto para gestión de incapacidades laborales
 */
export interface IWorkDisabilityPort {
  /**
   * Obtiene las incapacidades laborales del empleado
   * @param employeeId - ID del empleado
   * @returns Lista de incapacidades laborales
   */
  getWorkDisabilities(employeeId: number): Promise<IWorkDisability[]>;
}
