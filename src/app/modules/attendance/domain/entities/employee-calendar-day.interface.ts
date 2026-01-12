import { IEmployeeAssist } from './employee-assist.interface';

/**
 * Día del calendario del empleado
 */
export interface IEmployeeCalendarDay {
  day: string;
  assist: IEmployeeAssist;
}
