import { IEmployeeProfile } from './employee-profile.interface';

/**
 * Puerto para obtener la información del perfil del empleado
 */
export interface IProfilePort {
  /**
   * Obtiene el perfil completo del empleado por su identificador
   *
   * @param employeeId - Identificador único del empleado
   * @returns Promesa con el perfil del empleado o null si no existe
   */
  getEmployeeProfile(employeeId: number): Promise<IEmployeeProfile | null>;
}
