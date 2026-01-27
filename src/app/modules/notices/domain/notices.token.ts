import { InjectionToken } from '@angular/core';
import { INoticePort } from './notices.port';

/**
 * Token de inyección para el puerto de avisos
 */
export const NOTICES_PORT = new InjectionToken<INoticePort>('NOTICES_PORT');
