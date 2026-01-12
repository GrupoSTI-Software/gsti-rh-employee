import { ISystemSettings } from './system-settings.interface';

/**
 * Puerto para obtener configuraciones del sistema
 * Define la interfaz que debe implementar cualquier adaptador
 */
export interface ISystemSettingsPort {
  /**
   * Obtiene las configuraciones activas del sistema
   * @returns Promise con las configuraciones del sistema
   */
  getActiveSettings(): Promise<ISystemSettings | null>;
}
