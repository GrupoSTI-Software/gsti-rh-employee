import { inject, Injectable } from '@angular/core';
import { ATTENDANCE_PORT } from '../domain/attendance.token';
import { AttendancePort } from '../domain/attendance.port';

/**
 * Caso de uso para registrar una asistencia
 */
@Injectable({
  providedIn: 'root',
})
export class StoreAssistUseCase {
  private readonly attendancePort = inject<AttendancePort>(ATTENDANCE_PORT);

  /**
   * Ejecuta el caso de uso para registrar asistencia
   */
  async execute(
    employeeId: number,
    latitude: number,
    longitude: number,
    precision: number,
  ): Promise<boolean> {
    try {
      return await this.attendancePort.storeAssist(employeeId, latitude, longitude, precision);
    } catch (error) {
      console.error('Error al registrar asistencia:', error);
      return false;
    }
  }
}
