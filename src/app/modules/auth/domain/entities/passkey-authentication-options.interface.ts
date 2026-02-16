/**
 * Opciones para la autenticación con Passkey
 */
export interface IPasskeyAuthenticationOptions {
  /**
   * Challenge criptográfico del servidor
   */
  challenge: string;

  /**
   * Tiempo de espera en milisegundos
   */
  timeout?: number;

  /**
   * ID del Relying Party
   */
  rpId?: string;

  /**
   * Credenciales permitidas para la autenticación
   */
  allowCredentials?: {
    id: string;
    type: string;
    transports?: ('usb' | 'nfc' | 'ble' | 'internal')[];
  }[];

  /**
   * Nivel de verificación de usuario requerido
   */
  userVerification?: 'required' | 'preferred' | 'discouraged';
}
