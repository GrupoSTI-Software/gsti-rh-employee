import { inject, Injectable } from '@angular/core';
import { IAuthResult } from '../domain/auth.port';
import { AUTH_PORT } from '../domain/auth.token';
import { DeviceService } from '@core/services/device.service';

/**
 * Caso de uso: Login con Passkey
 * Contiene la lógica de negocio para el inicio de sesión mediante Passkey
 */
@Injectable({
  providedIn: 'root',
})
export class LoginWithPasskeyUseCase {
  private readonly authPort = inject(AUTH_PORT);
  private readonly deviceService = inject(DeviceService);

  /**
   * Inicia sesión usando una Passkey
   *
   * @param email - Email del usuario (opcional para autenticación condicional)
   * @returns Resultado de la autenticación
   */
  async execute(email?: string): Promise<IAuthResult> {
    // Validar email si se proporciona
    if (email !== undefined && email.length > 0 && !this.isValidEmail(email)) {
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
      // Paso 1: Solicitar opciones de autenticación al servidor
      const authenticationOptions = await this.authPort.requestPasskeyAuthenticationOptions(email);

      // Paso 2: Obtener credencial usando WebAuthn API
      const credential = await this.getPasskeyCredential(authenticationOptions);

      if (!credential) {
        return {
          success: false,
          error: 'No se pudo obtener la Passkey. Intenta nuevamente.',
        };
      }

      // Paso 3: Obtener información del dispositivo
      const deviceInfo = this.deviceService.getDeviceInfo();

      // Paso 4: Completar la autenticación en el servidor (incluir email para vincular con challenge)
      return await this.authPort.completePasskeyAuthentication(credential, deviceInfo, email);
    } catch (error: unknown) {
      if (error instanceof Error) {
        // Manejar errores específicos de WebAuthn
        if (error.name === 'NotAllowedError') {
          return {
            success: false,
            error: 'Operación cancelada o no autorizada',
          };
        }
        if (error.name === 'NotSupportedError') {
          return {
            success: false,
            error: 'Tu dispositivo no soporta esta funcionalidad',
          };
        }
        if (error.name === 'SecurityError') {
          return {
            success: false,
            error: 'Error de seguridad. Verifica que estés en una conexión segura (HTTPS)',
          };
        }

        return {
          success: false,
          error: error.message || 'Error al autenticar con Passkey',
        };
      }

      return {
        success: false,
        error: 'Error desconocido al autenticar con Passkey',
      };
    }
  }

  /**
   * Obtiene una credencial Passkey usando WebAuthn API
   */
  private async getPasskeyCredential(options: {
    challenge: string;
    timeout?: number;
    rpId?: string;
    allowCredentials?: {
      id: string;
      type: string;
      transports?: ('usb' | 'nfc' | 'ble' | 'internal')[];
    }[];
    userVerification?: 'required' | 'preferred' | 'discouraged';
  }): Promise<PublicKeyCredential | null> {
    try {
      // Convertir challenge de base64url a Uint8Array
      const challengeBuffer = this.base64urlToBuffer(options.challenge);

      // Convertir allowCredentials si existen
      const allowCredentials = options.allowCredentials?.map((cred) => ({
        id: this.base64urlToBuffer(cred.id),
        type: cred.type as PublicKeyCredentialType,
        transports: cred.transports as AuthenticatorTransport[],
      }));

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challengeBuffer,
        timeout: options.timeout,
        rpId: options.rpId,
        allowCredentials: allowCredentials,
        userVerification: options.userVerification,
      };

      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
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
