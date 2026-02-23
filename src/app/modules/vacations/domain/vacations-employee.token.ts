import { InjectionToken } from '@angular/core';
import { IVacationsEmployeePort } from './entities/vacations-employee-port.interface';

/**
 * Token de inyección para el puerto de años trabajados del módulo Vacaciones
 */
export const VACATIONS_EMPLOYEE_PORT = new InjectionToken<IVacationsEmployeePort>(
  'VACATIONS_EMPLOYEE_PORT',
);
