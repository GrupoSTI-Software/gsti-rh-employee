/**
 * Puerto para obtener configuraciones del sistema
 * Define la interfaz que debe implementar cualquier adaptador
 */
export interface SystemSettingsPort {
  /**
   * Obtiene las configuraciones activas del sistema
   * @returns Promise con las configuraciones del sistema
   */
  getActiveSettings(): Promise<SystemSettings | null>;
}

/**
 * Modelo de datos para las configuraciones del sistema
 */
export interface SystemSettings {
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
}

/**
 * Respuesta de la API para configuraciones del sistema
 */
export interface SystemSettingsApiResponse {
  type: string;
  title: string;
  message: string;
  data: {
    systemSetting: SystemSettings;
  };
}

