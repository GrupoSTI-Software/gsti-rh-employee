import { Injectable, inject } from '@angular/core';
import { PasswordlessWebAuthnAdapter } from './passwordless-webauthn.adapter';

/**
 * Servicio de demostración para probar Passkeys sin backend
 * Simula el flujo completo de registro y autenticación
 */
@Injectable({
  providedIn: 'root',
})
export class PasskeyDemoService {
  private readonly passwordlessAdapter = inject(PasswordlessWebAuthnAdapter);

  // Almacenamiento temporal de credenciales en memoria
  private registeredCredentials = new Map<
    string,
    {
      credentialId: string;
      publicKey: string;
      userEmail: string;
      deviceName: string;
      createdAt: Date;
    }
  >();

  /**
   * Registra una Passkey en modo demo (sin backend)
   *
   * @param email - Email del usuario
   * @param deviceName - Nombre del dispositivo
   * @returns Resultado del registro
   */
  async registerDemo(
    email: string,
    deviceName: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Generar un challenge aleatorio
      const challenge = this.passwordlessAdapter.generateChallenge();

      // Registrar la credencial
      const registration = await this.passwordlessAdapter.register(challenge, {
        id: this.generateUserId(email),
        name: email,
        displayName: email.split('@')[0],
      });

      // Guardar en el almacenamiento temporal
      this.registeredCredentials.set(email, {
        credentialId: registration.credential.id,
        publicKey: registration.credential.publicKey,
        userEmail: email,
        deviceName,
        createdAt: new Date(),
      });

      // También guardar en localStorage para persistencia
      this.saveToLocalStorage();

      return { success: true };
    } catch (error: unknown) {
      console.error('❌ [DEMO] Error al registrar Passkey:', error);

      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: 'Error desconocido al registrar Passkey',
      };
    }
  }

  /**
   * Autentica con una Passkey en modo demo (sin backend)
   *
   * @param email - Email del usuario (opcional)
   * @returns Resultado de la autenticación
   */
  async authenticateDemo(email?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Cargar credenciales desde localStorage
      this.loadFromLocalStorage();

      // Generar un challenge aleatorio
      const challenge = this.passwordlessAdapter.generateChallenge();

      // Obtener IDs de credenciales permitidas
      const allowedCredentials = email
        ? ([this.registeredCredentials.get(email)?.credentialId].filter(Boolean) as string[])
        : Array.from(this.registeredCredentials.values()).map((cred) => cred.credentialId);

      if (allowedCredentials.length === 0) {
        console.warn('⚠️ [DEMO] No hay credenciales registradas');
        return {
          success: false,
          error: 'No hay Passkeys registradas. Por favor, registra una primero.',
        };
      }

      // Autenticar
      const _authentication = await this.passwordlessAdapter.authenticate(
        challenge,
        allowedCredentials,
      );

      return { success: true };
    } catch (error: unknown) {
      console.error('❌ [DEMO] Error al autenticar:', error);

      if (error instanceof Error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: 'Error desconocido al autenticar',
      };
    }
  }

  /**
   * Verifica si un usuario tiene Passkeys registradas en modo demo
   *
   * @param email - Email del usuario
   * @returns true si tiene Passkeys registradas
   */
  hasPasskeysDemo(email: string): boolean {
    this.loadFromLocalStorage();
    return this.registeredCredentials.has(email);
  }

  /**
   * Obtiene todas las credenciales registradas en modo demo
   */
  getRegisteredCredentials(): {
    credentialId: string;
    publicKey: string;
    userEmail: string;
    deviceName: string;
    createdAt: Date;
  }[] {
    this.loadFromLocalStorage();
    return Array.from(this.registeredCredentials.values());
  }

  /**
   * Elimina todas las credenciales registradas en modo demo
   */
  clearAllCredentials(): void {
    this.registeredCredentials.clear();
    localStorage.removeItem('passkey_demo_credentials');
  }

  /**
   * Genera un ID de usuario aleatorio
   */
  private generateUserId(email: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(email + Date.now());
    const hashBuffer = crypto.subtle.digest('SHA-256', data);
    return hashBuffer.then((hash) => {
      const bytes = new Uint8Array(hash);
      return this.passwordlessAdapter['bufferToBase64url'](bytes);
    }) as unknown as string;
  }

  /**
   * Guarda las credenciales en localStorage
   */
  private saveToLocalStorage(): void {
    const data = Array.from(this.registeredCredentials.entries()).map(([email, cred]) => ({
      email,
      ...cred,
      createdAt: cred.createdAt.toISOString(),
    }));
    localStorage.setItem('passkey_demo_credentials', JSON.stringify(data));
  }

  /**
   * Carga las credenciales desde localStorage
   */
  private loadFromLocalStorage(): void {
    const stored = localStorage.getItem('passkey_demo_credentials');
    if (stored) {
      try {
        const data = JSON.parse(stored) as {
          email: string;
          credentialId: string;
          publicKey: string;
          userEmail: string;
          deviceName: string;
          createdAt: string;
        }[];
        this.registeredCredentials.clear();
        for (const item of data) {
          this.registeredCredentials.set(item.email, {
            credentialId: item.credentialId,
            publicKey: item.publicKey,
            userEmail: item.userEmail,
            deviceName: item.deviceName,
            createdAt: new Date(item.createdAt),
          });
        }
      } catch {
        // Ignorar errores de parsing
      }
    }
  }
}
