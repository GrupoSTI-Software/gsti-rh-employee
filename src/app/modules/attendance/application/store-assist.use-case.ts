import { inject, Injectable } from '@angular/core';
import { ATTENDANCE_PORT } from '../domain/attendance.token';
import { IAttendancePort } from '../domain/attendance.port';
import { LoggerService } from '@core/services/logger.service';

/**
 * Caso de uso para registrar una asistencia
 */
@Injectable({
  providedIn: 'root',
})
export class StoreAssistUseCase {
  private readonly attendancePort = inject<IAttendancePort>(ATTENDANCE_PORT);
  private readonly logger = inject(LoggerService);

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
      this.logger.error('Error al registrar asistencia:', error);
      return false;
    }
  }
}
