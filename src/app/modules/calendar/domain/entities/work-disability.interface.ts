import { IWorkDisabilityPeriod } from './work-disability-period.interface';

/**
 * Tipo de cobertura de seguro
 */
export interface IInsuranceCoverageType {
  insuranceCoverageTypeId: number;
  insuranceCoverageTypeName: string;
  insuranceCoverageTypeDescription: string;
  insuranceCoverageTypeSlug: string;
  insuranceCoverageTypeActive: number;
  insuranceCoverageTypeCreatedAt: string;
  insuranceCoverageTypeUpdatedAt: string;
  deletedAt: string | null;
}

/**
 * Incapacidad laboral
 */
export interface IWorkDisability {
  workDisabilityId: number;
  workDisabilityUuid: string;
  employeeId: number;
  insuranceCoverageTypeId: number;
  workDisabilityCreatedAt: string;
  workDisabilityUpdatedAt: string;
  deletedAt: string | null;
  insuranceCoverageType: IInsuranceCoverageType;
  workDisabilityPeriods: IWorkDisabilityPeriod[];
}
