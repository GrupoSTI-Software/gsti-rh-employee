/**
 * Resultado de la operación de verificación de código de verificación
 */
export interface IPincodePasswordResult {
  success: boolean;
  token?: string;
  error?: string;
}
