import { inject, Injectable } from '@angular/core';
import { IAuthResult } from '../domain/auth.port';
import { AUTH_PORT } from '../domain/auth.token';

/**
 * Caso de uso: Registrar Passkey
 * Contiene la lógica de negocio para el registro de una nueva Passkey
 */
@Injectable({
  providedIn: 'root',
})
export class RegisterPasskeyUseCase {
  private readonly authPort = inject(AUTH_PORT);

  /**
   * Registra una nueva Passkey para el usuario autenticado
   *
   * @param email - Email del usuario
   * @param deviceName - Nombre descriptivo del dispositivo (opcional)
   * @returns Resultado del registro de la Passkey
   */
  async execute(email: string, deviceName?: string): Promise<IAuthResult> {
    // Validaciones de negocio
    if (!email || email.length === 0) {
      return {
        success: false,
        error: 'El email es requerido para registrar una Passkey',
      };
    }

    if (!this.isValidEmail(email)) {
      return {
        success: false,
        error: 'El formato del email no es válido',
      };
    }

    // Verificar soporte de Passkeys
    if (!this.authPort.isPasskeySupported()) {
      return {
        success: false,
        error: 'Tu navegador no soporta Passkeys. Actualiza tu navegador o dispositivo.',
      };
    }

    try {
      // Paso 1: Solicitar opciones de registro al servidor
      const registrationOptions = await this.authPort.requestPasskeyRegistrationOptions(email);

      // Paso 2: Crear credencial usando WebAuthn API
      const credential = await this.createPasskeyCredential(registrationOptions);

      if (!credential) {
        return {
          success: false,
          error: 'No se pudo crear la Passkey. Intenta nuevamente.',
        };
      }

      // Paso 3: Completar el registro en el servidor
      return await this.authPort.completePasskeyRegistration(email, credential, deviceName);
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Manejar errores específicos de WebAuthn
        if (error.name === 'NotAllowedError') {
          return {
            success: false,
            error: 'Operación cancelada o no autorizada',
          };
        }
        if (error.name === 'InvalidStateError') {
          return {
            success: false,
            error: 'Esta Passkey ya está registrada en este dispositivo',
          };
        }
        if (error.name === 'NotSupportedError') {
          return {
            success: false,
            error: 'Tu dispositivo no soporta esta funcionalidad',
          };
        }

        return {
          success: false,
          error: error.message || 'Error al registrar la Passkey',
        };
      }

      return {
        success: false,
        error: 'Error desconocido al registrar la Passkey',
      };
    }
  }

  /**
   * Crea una credencial Passkey usando WebAuthn API
   */
  private async createPasskeyCredential(options: {
    challenge: string;
    user: { id: string; name: string; displayName: string };
    rp: { name: string; id?: string };
    pubKeyCredParams: { type: string; alg: number }[];
    timeout?: number;
    excludeCredentials?: { id: string; type: string }[];
    authenticatorSelection?: {
      authenticatorAttachment?: 'platform' | 'cross-platform';
      requireResidentKey?: boolean;
      residentKey?: 'discouraged' | 'preferred' | 'required';
      userVerification?: 'required' | 'preferred' | 'discouraged';
    };
    attestation?: 'none' | 'indirect' | 'direct';
  }): Promise<PublicKeyCredential | null> {
    try {
      // Convertir challenge de base64url a Uint8Array
      const challengeBuffer = this.base64urlToBuffer(options.challenge);
      const userIdBuffer = this.base64urlToBuffer(options.user.id);

      // Convertir excludeCredentials si existen
      const excludeCredentials = options.excludeCredentials?.map((cred) => ({
        id: this.base64urlToBuffer(cred.id),
        type: cred.type as PublicKeyCredentialType,
      }));

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: challengeBuffer,
        rp: options.rp,
        user: {
          id: userIdBuffer,
          name: options.user.name,
          displayName: options.user.displayName,
        },
        pubKeyCredParams: options.pubKeyCredParams.map((param) => ({
          type: param.type as PublicKeyCredentialType,
          alg: param.alg,
        })),
        timeout: options.timeout,
        excludeCredentials: excludeCredentials,
        authenticatorSelection: options.authenticatorSelection,
        attestation: options.attestation,
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      });

      return credential as PublicKeyCredential;
    } catch (error: unknown) {
      throw error;
    }
  }

  /**
   * Convierte una cadena base64url a ArrayBuffer
   */
  private base64urlToBuffer(base64url: string): ArrayBuffer {
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
   * Valida el formato del email
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
