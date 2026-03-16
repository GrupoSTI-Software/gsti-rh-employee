import { InjectionToken } from '@angular/core';
import { IProfilePort } from './profile.port';

/**
 * Token de inyección para el puerto del perfil del empleado
 */
export const PROFILE_PORT = new InjectionToken<IProfilePort>('PROFILE_PORT');
