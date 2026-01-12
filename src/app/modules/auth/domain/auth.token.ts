import { InjectionToken } from '@angular/core';
import { IAuthPort } from './auth.port';

export const AUTH_PORT = new InjectionToken<IAuthPort>('AuthPort');
