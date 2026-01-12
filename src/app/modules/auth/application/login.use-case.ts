import { inject, Injectable } from '@angular/core';
import { IAuthResult } from '../domain/auth.port';
import { AUTH_PORT } from '../domain/auth.token';
import { DeviceService } from '@core/services/device.service';

/**
 * Caso de uso: Login
 * Contiene la lógica de negocio para el inicio de sesión
 */
@Injectable({
  providedIn: 'root',
})
export class LoginUseCase {
  private readonly authPort = inject(AUTH_PORT);
  private readonly deviceService = inject(DeviceService);

  async execute(email: string, password: string): Promise<IAuthResult> {
    // Validaciones de negocio
    if (!email || !password) {
      return {
        success: false,
        error: 'Email y contraseña son requeridos',
      };
    }

    if (!this.isValidEmail(email)) {
      return {
        success: false,
        error: 'El formato del email no es válido',
      };
    }

    // Obtener información del dispositivo
    const deviceInfo = this.deviceService.getDeviceInfo();

    // Delegar al puerto de autenticación con información del dispositivo
    return this.authPort.login(email, password, deviceInfo);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
