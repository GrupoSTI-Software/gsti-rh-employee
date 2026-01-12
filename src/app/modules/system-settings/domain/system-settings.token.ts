import { InjectionToken } from '@angular/core';
import { ISystemSettingsPort } from './system-settings.port';

/**
 * Token de inyección para el puerto de configuraciones del sistema
 */
export const SYSTEM_SETTINGS_PORT = new InjectionToken<ISystemSettingsPort>('SYSTEM_SETTINGS_PORT');
