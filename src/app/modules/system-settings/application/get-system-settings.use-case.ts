import { inject, Injectable } from '@angular/core';
import { SYSTEM_SETTINGS_PORT } from '../domain/system-settings.token';
import { ISystemSettings, ISystemSettingsPort } from '../domain/system-settings.port';
import { LoggerService } from '@core/services/logger.service';

/**
 * Caso de uso para obtener las configuraciones activas del sistema
 */
@Injectable({
  providedIn: 'root',
})
export class GetSystemSettingsUseCase {
  private readonly systemSettingsPort = inject<ISystemSettingsPort>(SYSTEM_SETTINGS_PORT);
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para obtener las configuraciones activas
   * @returns Promise con las configuraciones del sistema o null si hay error
   */
  async execute(): Promise<ISystemSettings | null> {
    try {
      return await this.systemSettingsPort.getActiveSettings();
    } catch (error) {
      this.logger.error('Error al obtener configuraciones del sistema:', error);
      return null;
    }
  }
}
