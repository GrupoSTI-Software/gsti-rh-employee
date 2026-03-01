import { InjectionToken } from '@angular/core';
import { IForgotPasswordPort } from './forgot-password.port';

export const FORGOT_PASSWORD_PORT = new InjectionToken<IForgotPasswordPort>('ForgotPasswordPort');
