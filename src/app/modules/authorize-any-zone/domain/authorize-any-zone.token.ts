import { InjectionToken } from '@angular/core';
import { IAuthorizeAnyZonePort } from './entities/authorize-any-zone-port.interface';

/**
 * Token de inyección para el puerto de si el empleado tiene permiso para registrar asistencia en cualquier zona
 */
export const AUTHORIZE_ANY_ZONE_PORT = new InjectionToken<IAuthorizeAnyZonePort>(
  'AUTHORIZE_ANY_ZONE_PORT',
);
