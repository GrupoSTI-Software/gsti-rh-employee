import { InjectionToken } from '@angular/core';
import { IExceptionPort } from './entities/exception-port.interface';

/**
 * Token de inyección para el puerto de excepciones
 */
export const EXCEPTION_PORT = new InjectionToken<IExceptionPort>('EXCEPTION_PORT');
