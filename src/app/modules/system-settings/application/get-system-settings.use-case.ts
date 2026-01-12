import { inject, Injectable } from '@angular/core';
import { SYSTEM_SETTINGS_PORT } from '../domain/system-settings.token';
import { SystemSettings, SystemSettingsPort } from '../domain/system-settings.port';

/**
 * Caso de uso para obtener las configuraciones activas del sistema
 */
@Injectable({
  providedIn: 'root',
})
export class GetSystemSettingsUseCase {
  private readonly systemSettingsPort = inject<SystemSettingsPort>(SYSTEM_SETTINGS_PORT);

  /**
   * Ejecuta el caso de uso para obtener las configuraciones activas
   * @returns Promise con las configuraciones del sistema o null si hay error
   */
  async execute(): Promise<SystemSettings | null> {
    try {
      return await this.systemSettingsPort.getActiveSettings();
    } catch (error) {
      console.error('Error al obtener configuraciones del sistema:', error);
      return null;
    }
  }
}
