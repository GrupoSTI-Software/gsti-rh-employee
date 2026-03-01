import { ITolerance } from './tolerance.interface';

/**
 * Modelo de datos para las configuraciones del sistema
 */
export interface ISystemSettings {
  systemSettingId: number;
  systemSettingTradeName: string;
  systemSettingLogo: string;
  systemSettingBanner: string;
  systemSettingFavicon: string;
  systemSettingSidebarColor: string;
  systemSettingActive: number;
  systemSettingBusinessUnits: string;
  systemSettingToleranceCountPerAbsence: number;
  systemSettingRestrictFutureVacation: number;
  systemSettingBirthdayEmails: number;
  systemSettingAnniversaryEmails: number;
  systemSettingCreatedAt: string;
  systemSettingUpdatedAt: string;
  deletedAt: string | null;
  systemSettingTolerances: ITolerance[];
}
