import { IException } from './exception.interface';
import { IAssistance } from './assistance.interface';
import { IWorkHoliday } from './work-holiday.interface';

/**
 * Interfaz para el turno (interfaz anidada dentro de EmployeeAssist)
 */
interface IDateShift {
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
}

/**
 * Interfaz para check-in/check-out (interfaz anidada dentro de EmployeeAssist)
 */
interface ICheckTime {
  assistPunchTimeUtc: string | null;
}

/**
 * Datos de asistencia del empleado
 */
export interface IEmployeeAssist {
  checkIn: ICheckTime | null;
  checkOut: ICheckTime | null;
  checkEatIn: ICheckTime | null;
  checkEatOut: ICheckTime | null;
  dateShift: IDateShift | null;
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
  workHoliday: IWorkHoliday | null;
  hasExceptions: boolean;
  exceptions: IException[];
  assitFlatList: IAssistance[];
  isCheckOutNextDay: boolean;
  isCheckInEatNextDay: boolean;
  isCheckOutEatNextDay: boolean;
}
