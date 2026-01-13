import { IDeviceInfo } from './device-info.interface';
import { IAuthResult } from './auth-result.interface';
import { IUser } from './user.interface';

/**
 * Puerto (interfaz) para autenticación
 * Define el contrato que debe cumplir cualquier implementación de autenticación
 */
export interface IAuthPort {
  /**
   * Inicia sesión con credenciales de usuario
   * @param email - Email del usuario
   * @param password - Contraseña del usuario
   * @param deviceInfo - Información opcional del dispositivo
   * @returns Resultado de la autenticación
   */
  login(email: string, password: string, deviceInfo?: IDeviceInfo): Promise<IAuthResult>;

  /**
   * Cierra la sesión actual y limpia todos los datos de autenticación
   */
  logout(): Promise<void>;

  /**
   * Verifica si el usuario está autenticado con un token válido
   * @returns true si el usuario tiene un token válido y no expirado
   */
  isAuthenticated(): boolean;

  /**
   * Obtiene el usuario actual autenticado
   * @returns Usuario actual o null si no hay sesión
   */
  getCurrentUser(): IUser | null;

  /**
   * Obtiene el token JWT actual si es válido
   * @returns Token JWT o null si no hay token válido
   */
  getToken(): string | null;

  /**
   * Inicializa el usuario desde el token guardado
   * Se llama automáticamente cuando se recarga la página
   */
  initializeUserFromToken(): Promise<void>;
}
