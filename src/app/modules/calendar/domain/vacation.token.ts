import { InjectionToken } from '@angular/core';
import { IVacationPort } from './entities/vacation-port.interface';

/**
 * Token de inyección para el puerto de vacaciones
 */
export const VACATION_PORT = new InjectionToken<IVacationPort>('VACATION_PORT');
