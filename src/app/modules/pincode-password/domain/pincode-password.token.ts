import { InjectionToken } from '@angular/core';
import { IPincodePasswordPort } from './pincode-password.port';

export const PINCODE_PASSWORD_PORT = new InjectionToken<IPincodePasswordPort>(
  'PincodePasswordPort',
);
