import { inject, Injectable } from '@angular/core';
import { ATTENDANCE_PORT } from '../domain/attendance.token';
import { IAttendance, IAttendancePort } from '../domain/attendance.port';

/**
 * Caso de uso para obtener las asistencias del empleado
 */
@Injectable({
  providedIn: 'root',
})
export class GetAttendanceUseCase {
  private readonly attendancePort = inject<IAttendancePort>(ATTENDANCE_PORT);

  /**
   * Ejecuta el caso de uso para obtener asistencias
   */
  async execute(
    dateStart: string,
    dateEnd: string,
    employeeId: number,
  ): Promise<IAttendance | null> {
    try {
      return await this.attendancePort.getAttendance(dateStart, dateEnd, employeeId);
    } catch (error) {
      console.error('Error al obtener asistencia:', error);
      return null;
    }
  }
}
