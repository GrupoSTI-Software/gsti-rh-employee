import { InjectionToken } from '@angular/core';
import { AttendancePort } from './attendance.port';

/**
 * Token de inyección para el puerto de asistencia
 */
export const ATTENDANCE_PORT = new InjectionToken<AttendancePort>('ATTENDANCE_PORT');
