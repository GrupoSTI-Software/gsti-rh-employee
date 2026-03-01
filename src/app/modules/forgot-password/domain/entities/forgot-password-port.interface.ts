import { IForgotPasswordResult } from './forgot-password-result.interface';

/**
 * Puerto (interfaz) para recuperación de contraseña
 * Define el contrato que debe cumplir cualquier implementación de recuperación de contraseña
 */
export interface IForgotPasswordPort {
  /**
   * Recupera la contraseña de un usuario
   * @param email - Email del usuario
   * @returns Resultado de la recuperación de contraseña
   */
  forgotPassword(email: string): Promise<IForgotPasswordResult>;
}
