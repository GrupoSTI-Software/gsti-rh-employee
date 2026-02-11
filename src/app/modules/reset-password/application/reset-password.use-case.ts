import { inject, Injectable } from '@angular/core';
import { RESET_PASSWORD_PORT } from '../domain/reset-password.token';
import { IResetPasswordResult } from '../domain/reset-password.port';
/**
 * Caso de uso: Reset Password
 * Contiene la lógica de negocio para cuando el usuario quiera cambiar su contraseña
 */
@Injectable({
  providedIn: 'root',
})
export class ResetPasswordUseCase {
  private readonly resetPasswordPort = inject(RESET_PASSWORD_PORT);

  async execute(token: string, password: string): Promise<IResetPasswordResult> {
    // Validaciones de negocio
    if (!token || !password) {
      return {
        success: false,
        error: 'Token y contraseña son requeridos',
      };
    }
    if (!this.isValidPassword(password)) {
      return {
        success: false,
        error:
          'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula, un número y un carácter especial',
      };
    }

    // Delegar al puerto de reseteo de contraseña
    return this.resetPasswordPort.resetPassword(token, password);
  }

  private isValidPassword(password: string): boolean {
    const hasLowercase = /[a-z]/.test(password);
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialCharacter = /[!@#$%^&*()_+\[\]{}|;:,.<>?]/.test(password);
    const isValidLength = password.length >= 8;
    if (hasLowercase && hasUppercase && hasNumber && hasSpecialCharacter && isValidLength) {
      return true;
    } else {
      return false;
    }
  }
}
