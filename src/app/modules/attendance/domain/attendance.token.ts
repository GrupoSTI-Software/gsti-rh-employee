import { InjectionToken } from '@angular/core';
import { IAttendancePort } from './attendance.port';

/**
 * Token de inyección para el puerto de asistencia
 */
export const ATTENDANCE_PORT = new InjectionToken<IAttendancePort>('ATTENDANCE_PORT');
