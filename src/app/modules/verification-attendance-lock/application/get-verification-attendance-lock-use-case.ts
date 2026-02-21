import { inject, Injectable } from '@angular/core';
import { VERIFICATION_ATTENDANCE_LOCK_PORT } from '../domain/verification-attendance-lock.token';
import {
  IVerificationAttendanceLockApiResponse,
  IVerificationAttendanceLockPort,
} from '../domain/verification-attendance-lock.port';
import { LoggerService } from '@core/services/logger.service';

/**
 * Caso de uso para verificar el bloqueo de asistencia
 */
@Injectable({
  providedIn: 'root',
})
export class GetVerificationAttendanceLockUseCase {
  private readonly verificationAttendanceLockPort = inject<IVerificationAttendanceLockPort>(
    VERIFICATION_ATTENDANCE_LOCK_PORT,
  );
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para verificar el bloqueo de asistencia
   * @param type - Tipo de verificación: 'absences' o 'tardiness'
   * @returns Promise con la respuesta de la verificación de bloqueo de asistencia o null si hay error
   */
  async execute(type: string): Promise<IVerificationAttendanceLockApiResponse | null> {
    try {
      return await this.verificationAttendanceLockPort.verifyAttendanceLock(type);
    } catch (error) {
      this.logger.error('Error al verificar el bloqueo de asistencia:', error);
      return null;
    }
  }
}
