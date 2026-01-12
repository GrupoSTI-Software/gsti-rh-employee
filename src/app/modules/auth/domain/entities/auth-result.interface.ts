import { IUser } from './user.interface';

/**
 * Resultado de la operación de autenticación
 */
export interface IAuthResult {
  success: boolean;
  token?: string;
  user?: IUser;
  error?: string;
}
