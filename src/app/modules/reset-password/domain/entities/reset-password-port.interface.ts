import { IResetPasswordResult } from './reset-password-result.interface';

/**
 * Puerto (interfaz) para cambio de contraseña
 * Define el contrato que debe cumplir cualquier implementación de cambio de contraseña
 */
export interface IResetPasswordPort {
  /**
   * Recupera la contraseña de un usuario
   * @param token - Token de recuperación de contraseña
   * @param password - Nueva contraseña
   * @returns Resultado de la recuperación de contraseña
   */
  resetPassword(token: string, password: string): Promise<IResetPasswordResult>;
}
