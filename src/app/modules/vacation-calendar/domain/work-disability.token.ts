import { InjectionToken } from '@angular/core';
import { IWorkDisabilityPort } from './entities/work-disability-port.interface';

/**
 * Token de inyección para el puerto de incapacidades laborales
 */
export const WORK_DISABILITY_PORT = new InjectionToken<IWorkDisabilityPort>('WORK_DISABILITY_PORT');
