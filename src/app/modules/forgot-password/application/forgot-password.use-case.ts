import { inject, Injectable } from '@angular/core';
import { DeviceService } from '@core/services/device.service';
import { FORGOT_PASSWORD_PORT } from '../domain/forgot-password.token';
import { IForgotPasswordResult } from '../domain/forgot-password.port';
/**
 * Caso de uso: Forgot Password
 * Contiene la lógica de negocio para cuando el usuario olvide su contraseña y quiera recuperarla
 */
@Injectable({
  providedIn: 'root',
})
export class ForgotPasswordUseCase {
  private readonly forgotPasswordPort = inject(FORGOT_PASSWORD_PORT);
  private readonly deviceService = inject(DeviceService);

  async execute(email: string): Promise<IForgotPasswordResult> {
    // Validaciones de negocio
    if (!email) {
      return {
        success: false,
        error: 'Email es requerido',
      };
    }

    if (!this.isValidEmail(email)) {
      return {
        success: false,
        error: 'El formato del email no es válido',
      };
    }

    // Delegar al puerto de recuperación de contraseña
    return this.forgotPasswordPort.forgotPassword(email);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}
