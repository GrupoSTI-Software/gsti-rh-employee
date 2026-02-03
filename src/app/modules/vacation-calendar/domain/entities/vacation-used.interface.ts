/**
 * Día de vacación utilizado por el empleado
 */
export interface IVacationUsed {
  shiftExceptionId: number;
  employeeId: number;
  exceptionTypeId: number;
  shiftExceptionsDate: string;
  shiftExceptionsDescription: string;
  shiftExceptionCheckInTime: string | null;
  shiftExceptionCheckOutTime: string | null;
  shiftExceptionEnjoymentOfSalary: number | null;
  shiftExceptionTimeByTime: string | null;
  workDisabilityPeriodId: number | null;
  shiftExceptionsCreatedAt: string;
  shiftExceptionsUpdatedAt: string;
  deletedAt: string | null;
  vacationSettingId: number | null;
  employeeSignature: string | null;
}
