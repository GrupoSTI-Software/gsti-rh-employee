import { InjectionToken } from '@angular/core';
import { IVerificationAttendanceLockPort } from './verification-attendance-lock.port';

/**
 * Token de inyección para el puerto de verificación de bloqueo de asistencia
 */
export const VERIFICATION_ATTENDANCE_LOCK_PORT =
  new InjectionToken<IVerificationAttendanceLockPort>('VERIFICATION_ATTENDANCE_LOCK_PORT');
