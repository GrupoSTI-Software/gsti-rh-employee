import { InjectionToken } from '@angular/core';
import { IZoneCoordinatesPort } from './zone-coordinates.port';

/**
 * Token de inyección para el puerto de coordenadas de las zonas permitidas para el empleado
 */
export const ZONE_COORDINATES_PORT = new InjectionToken<IZoneCoordinatesPort>(
  'ZONE_COORDINATES_PORT',
);
