import { DeviceInfo } from './device-info.interface';

/**
 * Puerto (interfaz) para autenticación
 * Define el contrato que debe cumplir cualquier implementación de autenticación
 */
export interface AuthPort {
  login(
    email: string,
    password: string,
    deviceInfo?: DeviceInfo
  ): Promise<AuthResult>;
  logout(): Promise<void>;
  isAuthenticated(): boolean;
  getCurrentUser(): User | null;
}

export interface AuthResult {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
}

export interface Employee {
  employeeId: number;
  employeeCode: string;
  employeeFirstName: string;
  employeeLastName: string;
  employeeSecondLastName?: string;
  employeePayrollCode?: string;
  employeeHireDate?: string;
  employeePhoto?: string;
  employeeWorkSchedule?: string;
  employeeTypeOfContract?: string;
  employeeBusinessEmail?: string;
  departmentId?: number;
  positionId?: number;
  companyId?: number;
  businessUnitId?: number;
}

export interface Person {
  personId: number;
  personFirstname: string;
  personLastname: string;
  personSecondLastname?: string;
  personPhone?: string;
  personEmail?: string;
  personPhoneSecondary?: string;
  personGender?: string;
  personBirthday?: string;
  personCurp?: string;
  personRfc?: string;
  personImssNss?: string;
  personMaritalStatus?: string;
  personPlaceOfBirthCountry?: string;
  personPlaceOfBirthState?: string;
  personPlaceOfBirthCity?: string;
  employee?: Employee;
}

export interface User {
  id: string;
  email: string;
  name: string;
  employeeId?: number;
  person?: Person;
}

