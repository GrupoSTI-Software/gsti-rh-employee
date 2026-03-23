import { IVacationSetting } from './vacation-setting.interface';
import { IVacationUsed } from './vacation-used.interface';

/**
 * Información de un año trabajado con sus vacaciones
 */
export interface IYearWorked {
  year: number;
  yearsPassed: number;
  vacationSetting: IVacationSetting | null;
  vacationsUsedList: IVacationUsed[];
}
