import { InjectionToken } from '@angular/core';
import { AuthPort } from './auth.port';

export const AUTH_PORT = new InjectionToken<AuthPort>('AuthPort');
