import { Injectable } from '@angular/core';

/**
 * Adaptador para utilidades de WebAuthn
 * Maneja conversiones de datos y utilidades relacionadas con Passkeys
 */
@Injectable({
  providedIn: 'root',
})
export class WebAuthnAdapter {
  /**
   * Convierte un ArrayBuffer a una cadena base64url
   *
   * @param buffer - Buffer a convertir
   * @returns Cadena en formato base64url
   */
  bufferToBase64url(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (const byte of bytes) {
      binary += String.fromCharCode(byte);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Convierte una cadena base64url a ArrayBuffer
   *
   * @param base64url - Cadena en formato base64url
   * @returns ArrayBuffer resultante
   */
  base64urlToBuffer(base64url: string): ArrayBuffer {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const binary = atob(padded);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return buffer.buffer;
  }

  /**
   * Serializa una credencial de WebAuthn para enviarla al servidor
   *
   * @param credential - Credencial de PublicKeyCredential
   * @returns Objeto serializado para enviar al servidor
   */
  serializeCredentialForRegistration(credential: PublicKeyCredential): {
    id: string;
    rawId: string;
    type: string;
    response: {
      clientDataJSON: string;
      attestationObject: string;
    };
  } {
    const response = credential.response as AuthenticatorAttestationResponse;

    return {
      id: credential.id,
      rawId: this.bufferToBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: this.bufferToBase64url(response.clientDataJSON),
        attestationObject: this.bufferToBase64url(response.attestationObject),
      },
    };
  }

  /**
   * Serializa una credencial de autenticación para enviarla al servidor
   *
   * @param credential - Credencial de PublicKeyCredential
   * @returns Objeto serializado para enviar al servidor
   */
  serializeCredentialForAuthentication(credential: PublicKeyCredential): {
    id: string;
    rawId: string;
    type: string;
    response: {
      clientDataJSON: string;
      authenticatorData: string;
      signature: string;
      userHandle: string | null;
    };
  } {
    const response = credential.response as AuthenticatorAssertionResponse;

    return {
      id: credential.id,
      rawId: this.bufferToBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: this.bufferToBase64url(response.clientDataJSON),
        authenticatorData: this.bufferToBase64url(response.authenticatorData),
        signature: this.bufferToBase64url(response.signature),
        userHandle: response.userHandle ? this.bufferToBase64url(response.userHandle) : null,
      },
    };
  }

  /**
   * Verifica si el navegador soporta WebAuthn
   *
   * @returns true si el navegador soporta WebAuthn
   */
  isWebAuthnSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential !== undefined &&
      typeof window.PublicKeyCredential === 'function'
    );
  }

  /**
   * Verifica si el dispositivo tiene un autenticador de plataforma disponible
   * (como Touch ID, Face ID, Windows Hello)
   *
   * @returns Promise que resuelve a true si hay un autenticador disponible
   */
  async isPlatformAuthenticatorAvailable(): Promise<boolean> {
    if (!this.isWebAuthnSupported()) {
      return false;
    }

    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Verifica si el navegador soporta autenticación condicional
   * (permite autocompletar con Passkeys en campos de formulario)
   *
   * @returns Promise que resuelve a true si se soporta autenticación condicional
   */
  async isConditionalMediationAvailable(): Promise<boolean> {
    if (!this.isWebAuthnSupported()) {
      return false;
    }

    try {
      const available =
        window.PublicKeyCredential.isConditionalMediationAvailable !== undefined &&
        (await window.PublicKeyCredential.isConditionalMediationAvailable());
      return available;
    } catch {
      return false;
    }
  }
}
