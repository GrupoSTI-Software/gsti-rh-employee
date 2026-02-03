import { IPincodePasswordResult } from './pincode-password-result.interface';

/**
 * Puerto (interfaz) para verificación de código de verificación
 * Define el contrato que debe cumplir cualquier implementación de verificación de código de verificación
 */
export interface IPincodePasswordPort {
  /**
   * Verifica el código de verificación
   * @param code - Código de verificación
   * @returns Resultado de la verificación de código
   */
  verifyPincode(code: string): Promise<IPincodePasswordResult>;
}
