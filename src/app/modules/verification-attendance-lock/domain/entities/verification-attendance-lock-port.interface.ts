import { IVerificationAttendanceLockApiResponse } from './verification-attandance-lock-response.interface';

/**
 * Puerto para verificar el bloqueo de asistencia
 * Define la interfaz que debe implementar cualquier adaptador
 */
export interface IVerificationAttendanceLockPort {
  /**
   * Verifica el bloqueo de asistencia por faltas o retardos
   * @returns Promise con la respuesta de la verificación de bloqueo de asistencia
   */
  verifyAttendanceLock(): Promise<IVerificationAttendanceLockApiResponse | null>;
}
