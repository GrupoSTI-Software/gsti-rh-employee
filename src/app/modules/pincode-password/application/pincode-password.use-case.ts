import { inject, Injectable } from '@angular/core';
import { IPincodePasswordResult } from '../domain/pincode-password.port';
import { PINCODE_PASSWORD_PORT } from '../domain/pincode-password.token';
/**
 * Caso de uso: Pincode Password
 * Contiene la lógica de negocio para cuando el usuario quiera cambiar su contraseña
 */
@Injectable({
  providedIn: 'root',
})
export class PincodePasswordUseCase {
  private readonly pincodePasswordPort = inject(PINCODE_PASSWORD_PORT);

  async execute(pinCode: string): Promise<IPincodePasswordResult> {
    // Validaciones de negocio
    if (!pinCode) {
      return {
        success: false,
        error: 'Código de verificación es requerido',
      };
    }

    if (!this.isValidPinCode(pinCode)) {
      return {
        success: false,
        error: 'El formato del código de verificación no es válido',
      };
    }

    // Delegar al puerto de verificación de código de verificación
    return this.pincodePasswordPort.verifyPincode(pinCode);
  }

  private isValidPinCode(pinCode: string): boolean {
    const pinCodeRegex = /^[0-9]{6}$/;
    return pinCodeRegex.test(pinCode);
  }
}
