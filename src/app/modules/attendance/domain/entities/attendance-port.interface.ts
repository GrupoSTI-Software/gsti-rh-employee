import { IAttendance } from './attendance.interface';

/**
 * Puerto para gestión de asistencia
 */
export interface IAttendancePort {
  /**
   * Obtiene las asistencias del empleado para un rango de fechas
   */
  getAttendance(
    dateStart: string,
    dateEnd: string,
    employeeId: number,
  ): Promise<IAttendance | null>;

  /**
   * Registra una asistencia (check-in/check-out)
   */
  storeAssist(
    employeeId: number,
    latitude: number,
    longitude: number,
    precision: number,
  ): Promise<boolean>;
}
