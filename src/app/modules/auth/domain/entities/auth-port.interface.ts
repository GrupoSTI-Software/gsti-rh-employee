import { IDeviceInfo } from './device-info.interface';
import { IAuthResult } from './auth-result.interface';
import { IUser } from './user.interface';

/**
 * Puerto (interfaz) para autenticación
 * Define el contrato que debe cumplir cualquier implementación de autenticación
 */
export interface IAuthPort {
  login(email: string, password: string, deviceInfo?: IDeviceInfo): Promise<IAuthResult>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;
  getCurrentUser(): IUser | null;
  initializeUserFromToken(): Promise<void>;
}
