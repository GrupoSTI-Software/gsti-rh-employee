import { InjectionToken } from '@angular/core';
import { IResetPasswordPort } from './reset-password.port';

export const RESET_PASSWORD_PORT = new InjectionToken<IResetPasswordPort>('ResetPasswordPort');
