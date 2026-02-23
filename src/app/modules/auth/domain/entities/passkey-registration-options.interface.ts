/**
 * Opciones para el registro de una nueva Passkey
 */
export interface IPasskeyRegistrationOptions {
  /**
   * Challenge criptográfico del servidor
   */
  challenge: string;

  /**
   * Información del usuario
   */
  user: {
    id: string;
    name: string;
    displayName: string;
  };

  /**
   * Información del Relying Party (la aplicación)
   */
  rp: {
    name: string;
    id?: string;
  };

  /**
   * Algoritmos de clave pública permitidos
   */
  pubKeyCredParams: {
    type: string;
    alg: number;
  }[];

  /**
   * Tiempo de espera en milisegundos
   */
  timeout?: number;

  /**
   * Credenciales existentes a excluir
   */
  excludeCredentials?: {
    id: string;
    type: string;
  }[];

  /**
   * Preferencia de autenticador (platform, cross-platform)
   */
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    requireResidentKey?: boolean;
    residentKey?: 'discouraged' | 'preferred' | 'required';
    userVerification?: 'required' | 'preferred' | 'discouraged';
  };

  /**
   * Nivel de attestation requerido
   */
  attestation?: 'none' | 'indirect' | 'direct';
}
