import { IEvidence } from './evidence.interface';

/**
 * Interfaz de tipo de excepción (interfaz anidada dentro de Exception)
 */
interface IExceptionType {
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
}

/**
 * Excepción del turno
 */
export interface IException {
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
  exceptionType: IExceptionType;
  evidences?: IEvidence[];
}
