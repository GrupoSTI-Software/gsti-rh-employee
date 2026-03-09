/**
 * Tipo de excepción de turno
 */
export interface IExceptionType {
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
