/**
 * Resultado de una operación de Passkey
 */
export interface IPasskeyResult {
  /**
   * Indica si la operación fue exitosa
   */
  success: boolean;

  /**
   * Mensaje de error si la operación falló
   */
  error?: string;

  /**
   * Datos de la credencial si la operación fue exitosa
   */
  credential?: {
    id: string;
    rawId: ArrayBuffer;
    response: {
      clientDataJSON: ArrayBuffer;
      attestationObject?: ArrayBuffer;
      authenticatorData?: ArrayBuffer;
      signature?: ArrayBuffer;
      userHandle?: ArrayBuffer;
    };
    type: string;
  };
}
