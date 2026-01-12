import { InjectionToken } from '@angular/core';
import { SystemSettingsPort } from './system-settings.port';

/**
 * Token de inyección para el puerto de configuraciones del sistema
 */
export const SYSTEM_SETTINGS_PORT = new InjectionToken<SystemSettingsPort>('SYSTEM_SETTINGS_PORT');
