import { ISystemSettings } from './system-settings.interface';

/**
 * Respuesta de la API para configuraciones del sistema
 */
export interface ISystemSettingsApiResponse {
  type: string;
  title: string;
  message: string;
  data: {
    systemSetting: ISystemSettings;
  };
}
