/**
 * Credencial de Passkey almacenada
 */
export interface IPasskeyCredential {
  /**
   * ID único de la credencial
   */
  credentialId: string;

  /**
   * Clave pública de la credencial
   */
  publicKey: string;

  /**
   * Contador de uso de la credencial
   */
  counter: number;

  /**
   * ID del usuario asociado
   */
  userId: string;

  /**
   * Nombre descriptivo del dispositivo
   */
  deviceName?: string;

  /**
   * Fecha de creación
   */
  createdAt: string;

  /**
   * Última fecha de uso
   */
  lastUsedAt?: string;
}
