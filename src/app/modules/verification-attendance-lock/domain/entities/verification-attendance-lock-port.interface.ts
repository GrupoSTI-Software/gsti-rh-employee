import { IVerificationAttendanceLockApiResponse } from './verification-attandance-lock-response.interface';

/**
 * Puerto para verificar el bloqueo de asistencia
 * Define la interfaz que debe implementar cualquier adaptador
 */
export interface IVerificationAttendanceLockPort {
  /**
   * Verifica el bloqueo de asistencia por faltas o retardos
   * @param type - Tipo de verificación: 'absences' o 'tardiness'
   * @returns Promise con la respuesta de la verificación de bloqueo de asistencia
   */
  verifyAttendanceLock(type: string): Promise<IVerificationAttendanceLockApiResponse | null>;
}
