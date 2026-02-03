/**
 * Configuración de vacaciones según años de servicio
 */
export interface IVacationSetting {
  vacationSettingId: number;
  vacationSettingYearsOfService: number;
  vacationSettingVacationDays: number;
  vacationSettingCrew: number;
  vacationSettingCreatedAt: string;
  vacationSettingUpdatedAt: string;
  vacationSettingDeletedAt: string | null;
  vacationSettingApplySince: string;
}
