import { inject, Injectable } from '@angular/core';
import { LoggerService } from '@core/services/logger.service';
import { IEmployeeBiometricFaceIdPort } from '../domain/employee-biometric-face-id.port';
import { IEmployeeBiometricFaceId } from '../domain/entities/employee-biometric-face-id.interface';
import { BIO_EMPLOYEE_BIOMETRIC_FACE_ID_PORT } from '../domain/employee-biometric-face-id.token';

/**
 * Caso de uso para obtener la fotografía del rostro del empleado
 */
@Injectable({
  providedIn: 'root',
})
export class GetEmployeeBiometricFaceIdUseCase {
  private readonly employeeBiometricFaceIdPort = inject<IEmployeeBiometricFaceIdPort>(
    BIO_EMPLOYEE_BIOMETRIC_FACE_ID_PORT,
  );
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para obtener la fotografía del rostro del empleado
   */
  async execute(employeeId: number): Promise<IEmployeeBiometricFaceId | null> {
    try {
      return await this.employeeBiometricFaceIdPort.getEmployeeBiometricFaceId(employeeId);
    } catch (error) {
      this.logger.error('Error al obtener la fotografía del rostro del empleado:', error);
      return null;
    }
  }
}
