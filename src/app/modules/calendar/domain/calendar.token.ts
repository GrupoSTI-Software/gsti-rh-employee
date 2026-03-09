import { InjectionToken } from '@angular/core';
import { ICalendarPort } from './entities/calendar-port.interface';

/**
 * Token de inyección para el puerto de calendario
 */
export const CALENDAR_PORT = new InjectionToken<ICalendarPort>('CALENDAR_PORT');
