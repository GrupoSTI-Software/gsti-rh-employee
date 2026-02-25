import { IAssistance } from './assistance.interface';
import { IException } from './exception.interface';
import { IWorkHoliday } from './work-holiday.interface';

/**
 * Modelo de asistencia del día
 */
export interface IAttendance {
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
  holiday: IWorkHoliday | null;
  assistFlatList: IAssistance[];
  exceptions: IException[];
}
