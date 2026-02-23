import { IDeviceInfo } from './device-info.interface';
import { IAuthResult } from './auth-result.interface';
import { IUser } from './user.interface';
import { IPasskeyRegistrationOptions } from './passkey-registration-options.interface';
import { IPasskeyAuthenticationOptions } from './passkey-authentication-options.interface';

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

  /**
   * Solicita las opciones de registro de Passkey desde el servidor
   * @param email - Email del usuario para el que se registrará la Passkey
   * @returns Opciones de registro de Passkey
   */
  requestPasskeyRegistrationOptions(email: string): Promise<IPasskeyRegistrationOptions>;

  /**
   * Completa el registro de una Passkey en el servidor
   * @param email - Email del usuario
   * @param credential - Credencial creada por el navegador
   * @param deviceName - Nombre descriptivo del dispositivo
   * @returns Resultado del registro
   */
  completePasskeyRegistration(
    email: string,
    credential: PublicKeyCredential,
    deviceName?: string,
  ): Promise<IAuthResult>;

  /**
   * Solicita las opciones de autenticación con Passkey desde el servidor
   * @param email - Email opcional del usuario (para autenticación condicional)
   * @returns Opciones de autenticación con Passkey
   */
  requestPasskeyAuthenticationOptions(email?: string): Promise<IPasskeyAuthenticationOptions>;

  /**
   * Completa la autenticación con Passkey
   * @param credential - Credencial utilizada para autenticación
   * @param deviceInfo - Información opcional del dispositivo
   * @param email - Email del usuario (opcional, para vincular con el challenge)
   * @returns Resultado de la autenticación
   */
  completePasskeyAuthentication(
    credential: PublicKeyCredential,
    deviceInfo?: IDeviceInfo,
    email?: string,
  ): Promise<IAuthResult>;

  /**
   * Verifica si el navegador soporta Passkeys (WebAuthn)
   * @returns true si el navegador soporta Passkeys
   */
  isPasskeySupported(): boolean;

  /**
   * Verifica si el usuario tiene Passkeys registradas
   * @param email - Email del usuario
   * @returns true si el usuario tiene al menos una Passkey registrada
   */
  hasPasskeys(email: string): Promise<boolean>;
}
