import { IPerson } from './person.interface';

/**
 * Información del usuario autenticado
 */
export interface IUser {
  id: string;
  email: string;
  name: string;
  employeeId?: number;
  person?: IPerson;
}
