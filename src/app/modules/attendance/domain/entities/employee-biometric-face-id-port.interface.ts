import { IEmployeeBiometricFaceId } from './employee-biometric-face-id.interface';

/**
 * Puerto para gestion de fotografía del rostro del empleado
 */
export interface IEmployeeBiometricFaceIdPort {
  /**
   * Obtiene la fotografía del rostro del empleado
   */
  getEmployeeBiometricFaceId(employeeId: number): Promise<IEmployeeBiometricFaceId | null>;
}
