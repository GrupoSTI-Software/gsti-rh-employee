import { IEmployeeBiometricFaceId } from './employee-biometric-face-id.interface';

/**
 * Respuesta de la API para obtener la fotografía del rostro del empleado
 */
export interface IEmployeeBiometricFaceIdApiResponse {
  status: number;
  type: string;
  title: string;
  message: string;
  data: {
    employeeBiometricFaceId: IEmployeeBiometricFaceId;
  };
}
