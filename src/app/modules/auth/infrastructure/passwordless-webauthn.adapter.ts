import { Injectable } from '@angular/core';
import { AuthenticationJSON, client } from '@passwordless-id/webauthn';

/**
 * Adaptador para la librería @passwordless-id/webauthn
 * Proporciona una interfaz simplificada para trabajar con WebAuthn
 */
@Injectable({
  providedIn: 'root',
})
export class PasswordlessWebAuthnAdapter {
  /**
   * Verifica si el navegador soporta WebAuthn
   */
  isAvailable(): boolean {
    return client.isAvailable();
  }

  /**
   * Verifica si hay un autenticador de plataforma disponible
   * (Touch ID, Face ID, Windows Hello, etc.)
   */
  async isLocalAuthenticatorAvailable(): Promise<boolean> {
    try {
      return await client.isLocalAuthenticator();
    } catch {
      return false;
    }
  }

  /**
   * Registra una nueva credencial usando la librería passwordless-id
   *
   * @param challenge - Challenge del servidor (base64url)
   * @param user - Información del usuario
   * @returns Credencial registrada
   */
  async register(
    challenge: string,
    user: {
      id: string;
      name: string;
      displayName: string;
    },
  ): Promise<{
    credential: {
      id: string;
      publicKey: string;
      algorithm: number;
    };
    authenticatorData: string;
    clientData: string;
    attestationData?: string;
  }> {
    try {
      const registration = await client.register({
        challenge,
        user,
        userVerification: 'required',
        timeout: 60000,
        attestation: false,
        discoverable: 'preferred',
      });

      /**
       * Mapeamos el resultado de RegistrationJSON de passwordless-id al
       * contrato esperado, extrayendo correctamente cada propiedad.
       */
      return {
        credential: {
          id: registration.id,
          publicKey: registration.response.publicKey,
          algorithm: registration.response.publicKeyAlgorithm,
        },
        authenticatorData: registration.response.authenticatorData,
        clientData: registration.response.clientDataJSON,
        attestationData: registration.response.authenticatorData,
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error al registrar credencial: ${error.message}`);
      }
      throw new Error('Error desconocido al registrar credencial');
    }
  }

  /**
   * Autentica con una credencial existente
   *
   * @param challenge - Challenge del servidor (base64url)
   * @param credentialIds - IDs de credenciales permitidas (opcional)
   * @returns Aserción de autenticación
   */
  async authenticate(challenge: string, credentialIds?: string[]): Promise<AuthenticationJSON> {
    try {
      const authentication = await client.authenticate({
        challenge,
        allowCredentials: credentialIds,
        userVerification: 'required',
        timeout: 60000,
      });

      return authentication;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Error al autenticar: ${error.message}`);
      }
      throw new Error('Error desconocido al autenticar');
    }
  }

  /**
   * Genera un challenge aleatorio en formato base64url
   * Útil para testing sin backend
   */
  generateChallenge(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.bufferToBase64url(array);
  }

  /**
   * Convierte un ArrayBuffer a base64url
   */
  private bufferToBase64url(buffer: Uint8Array | ArrayBuffer): string {
    const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}
