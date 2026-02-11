/**
 * Período de incapacidad laboral
 */
export interface IWorkDisabilityPeriod {
  workDisabilityPeriodId: number;
  workDisabilityPeriodStartDate: string;
  workDisabilityPeriodEndDate: string;
  workDisabilityPeriodTicketFolio: string | null;
  workDisabilityPeriodFile: string | null;
  workDisabilityId: number;
  workDisabilityTypeId: number;
  workDisabilityPeriodCreatedAt: string;
  workDisabilityPeriodUpdatedAt: string;
  deletedAt: string | null;
  workDisabilityType: IWorkDisabilityType;
}

/**
 * Tipo de incapacidad laboral
 */
export interface IWorkDisabilityType {
  workDisabilityTypeId: number;
  workDisabilityTypeName: string;
  workDisabilityTypeDescription: string;
  workDisabilityTypeSlug: string;
  workDisabilityTypeActive: number;
  workDisabilityTypeCreatedAt: string;
  workDisabilityTypeUpdatedAt: string;
  deletedAt: string | null;
}
