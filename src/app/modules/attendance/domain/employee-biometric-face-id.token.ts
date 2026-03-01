import { InjectionToken } from '@angular/core';
import { IEmployeeBiometricFaceIdPort } from './employee-biometric-face-id.port';

/**
 * Token de inyección para el puerto de fotografía del rostro del empleado
 */
export const BIO_EMPLOYEE_BIOMETRIC_FACE_ID_PORT = new InjectionToken<IEmployeeBiometricFaceIdPort>(
  'BIO_EMPLOYEE_BIOMETRIC_FACE_ID_PORT',
);
