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

export interface User {
  id: string;
  email: string;
  name: string;
  employeeId?: number;
}

