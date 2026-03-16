import { IEmployee } from '@modules/auth/domain/entities/employee.interface';

/**
 * Respuesta de la API para obtener si el empleado tiene permiso para registrar asistencia en cualquier zona
 */
export interface IAuthorizeAnyZoneApiResponse {
  status: number;
  type: string;
  title: string;
  message: string;
  data: {
    employee: IEmployee;
  };
}
