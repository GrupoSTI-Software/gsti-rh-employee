import { IEmployeeCalendarDay } from './employee-calendar-day.interface';

/**
 * Respuesta de la API para obtener asistencia
 */
export interface IAttendanceApiResponse {
  status: number;
  type: string;
  title: string;
  message: string;
  data: {
    employeeCalendar: IEmployeeCalendarDay[];
  };
}
