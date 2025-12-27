/**
 * Puerto para gestión de asistencia
 */
export interface AttendancePort {
  /**
   * Obtiene las asistencias del empleado para un rango de fechas
   */
  getAttendance(
    dateStart: string,
    dateEnd: string,
    employeeId: number
  ): Promise<Attendance | null>;

  /**
   * Registra una asistencia (check-in/check-out)
   */
  storeAssist(
    employeeId: number,
    latitude: number,
    longitude: number,
    precision: number
  ): Promise<boolean>;
}

/**
 * Modelo de asistencia del día
 */
export interface Attendance {
  checkInTime: string | null;
  checkOutTime: string | null;
  checkEatInTime: string | null;
  checkEatOutTime: string | null;
  checkInStatus: string | null;
  checkOutStatus: string | null;
  checkEatInStatus: string | null;
  checkEatOutStatus: string | null;
  shiftInfo: string | null;
  isRestDay: boolean;
  isWorkDisabilityDate: boolean;
  isVacationDate: boolean;
  isHoliday: boolean;
  assistFlatList: Assistance[];
  exceptions: Exception[];
}

/**
 * Registro individual de asistencia
 */
export interface Assistance {
  employeeId: number;
  assistLatitude: number;
  assistLongitude: number;
  assistPunchTime: string;
}

/**
 * Excepción del turno
 */
export interface Exception {
  shiftExceptionId: number;
  type: string;
  shiftExceptionsDescription: string;
  shiftExceptionCheckInTime: string;
  shiftExceptionCheckOutTime: string;
  evidences: Evidence[];
}

/**
 * Evidencia de excepción
 */
export interface Evidence {
  evidenceId: number;
  evidenceUrl: string;
  evidenceType: string;
}

/**
 * Respuesta de la API para obtener asistencia
 */
export interface AttendanceApiResponse {
  checkIn: {
    assistPunchTimeUtc: string | null;
  } | null;
  checkOut: {
    assistPunchTimeUtc: string | null;
  } | null;
  checkEatIn: {
    assistPunchTimeUtc: string | null;
  } | null;
  checkEatOut: {
    assistPunchTimeUtc: string | null;
  } | null;
  checkInStatus: string | null;
  checkOutStatus: string | null;
  checkEatInStatus: string | null;
  checkEatOutStatus: string | null;
  shiftInfo: string | null;
  isRestDay: boolean;
  isWorkDisabilityDate: boolean;
  isVacationDate: boolean;
  isHoliday: boolean;
  assitFlatList: Assistance[];
  exceptions: Exception[];
}

