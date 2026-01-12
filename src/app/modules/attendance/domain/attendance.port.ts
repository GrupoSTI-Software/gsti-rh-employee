/**
 * Puerto para gestión de asistencia
 */
export interface AttendancePort {
  /**
   * Obtiene las asistencias del empleado para un rango de fechas
   */
  getAttendance(dateStart: string, dateEnd: string, employeeId: number): Promise<Attendance | null>;

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
  shiftTimeStart: string | null;
  shiftTimeEnd: string | null;
  shiftName: string | null;
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
  assistId: number;
  employeeId: number;
  assistLatitude: number | null;
  assistLongitude: number | null;
  assistPunchTime: string;
  assistTerminalAlias?: string | null;
  assistAreaAlias?: string | null;
}

/**
 * Excepción del turno
 */
export interface Exception {
  shiftExceptionId: number;
  employeeId: number;
  exceptionTypeId: number;
  shiftExceptionsDate: string;
  shiftExceptionsDescription: string;
  shiftExceptionCheckInTime: string | null;
  shiftExceptionCheckOutTime: string | null;
  shiftExceptionEnjoymentOfSalary: number;
  shiftExceptionTimeByTime: string | null;
  workDisabilityPeriodId: number | null;
  shiftExceptionsCreatedAt: string;
  shiftExceptionsUpdatedAt: string;
  deletedAt: string | null;
  vacationSettingId: number | null;
  exceptionType: {
    exceptionTypeId: number;
    exceptionTypeTypeName: string;
    exceptionTypeIcon: string;
    exceptionTypeSlug: string;
    exceptionTypeIsGeneral: number;
    exceptionTypeNeedCheckInTime: number;
    exceptionTypeNeedCheckOutTime: number;
    exceptionTypeNeedReason: number;
    exceptionTypeNeedEnjoymentOfSalary: number;
    exceptionTypeNeedPeriodInDays: number;
    exceptionTypeNeedPeriodInHours: number;
    exceptionTypeActive: number;
    exceptionTypeCanMasive: number;
    exceptionTypeCreatedAt: string;
    exceptionTypeUpdatedAt: string;
    deletedAt: string | null;
  };
  evidences?: Evidence[];
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
  status: number;
  type: string;
  title: string;
  message: string;
  data: {
    employeeCalendar: EmployeeCalendarDay[];
  };
}

/**
 * Día del calendario del empleado
 */
export interface EmployeeCalendarDay {
  day: string;
  assist: EmployeeAssist;
}

/**
 * Datos de asistencia del empleado
 */
export interface EmployeeAssist {
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
  dateShift: {
    shiftId: number;
    shiftName: string;
    shiftDayStart: number;
    shiftTimeStart: string;
    shiftActiveHours: string;
    shiftRestDays: string;
    shiftAccumulatedFault: number;
    shiftCreatedAt: string;
    shiftUpdatedAt: string;
    shiftCalculateFlag: string | null;
    shiftIsChange: boolean;
  } | null;
  dateShiftApplySince: string | null;
  employeeShiftId: number | null;
  shiftCalculateFlag: string | null;
  checkInDateTime: string | null;
  checkOutDateTime: string | null;
  checkInStatus: string | null;
  checkOutStatus: string | null;
  isFutureDay: boolean;
  isSundayBonus: boolean;
  isRestDay: boolean;
  isVacationDate: boolean;
  isWorkDisabilityDate: boolean;
  isHoliday: boolean;
  isBirthday: boolean;
  holiday: unknown | null;
  hasExceptions: boolean;
  exceptions: Exception[];
  assitFlatList: Assistance[];
  isCheckOutNextDay: boolean;
  isCheckInEatNextDay: boolean;
  isCheckOutEatNextDay: boolean;
}
