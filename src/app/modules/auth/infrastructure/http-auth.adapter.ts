import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { AuthPort, AuthResult, User, Person, Employee } from '../domain/auth.port';
import { environment } from '@env/environment';
import { DeviceInfo } from '../domain/device-info.interface';

/**
 * Adaptador HTTP para autenticación
 * Implementa el puerto AuthPort usando HTTP
 */
@Injectable({
  providedIn: 'root'
})
export class HttpAuthAdapter implements AuthPort {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly apiUrl = environment.apiUrl;
  private currentUser: User | null = null;
  private userInitialized = false;

  async login(
    email: string,
    password: string,
    deviceInfo?: DeviceInfo
  ): Promise<AuthResult> {
    try {
      const payload: {
        userEmail: string;
        userPassword: string;
        deviceToken?: string;
        deviceBrand?: string | null;
        deviceModel?: string;
        deviceOs?: string;
        deviceType?: string | null;
      } = {
        userEmail: email,
        userPassword: password
      };

      // Agregar información del dispositivo si está disponible
      if (deviceInfo) {
        payload.deviceToken = deviceInfo.deviceToken;
        payload.deviceBrand = deviceInfo.deviceBrand;
        payload.deviceModel = deviceInfo.deviceModel;
        payload.deviceOs = deviceInfo.deviceOs;
        payload.deviceType = deviceInfo.deviceType;
      }

      const loginResponse = await firstValueFrom<{
        type: string;
        title: string;
        message: string;
        data: {
          token: string;
          user: any;
        };
      }>(
        this.http.post<{
          type: string;
          title: string;
          message: string;
          data: {
            token: string;
            user: any;
          };
        }>(`${this.apiUrl}/auth/login`, payload)
      );

      // Verificar que la respuesta sea exitosa
      if (
        loginResponse?.type === 'success' &&
        loginResponse?.data?.token &&
        loginResponse?.data?.user
      ) {
        const token = loginResponse.data.token;
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('auth_token', token);
        }

        // Obtener información completa del usuario desde /auth/session
        try {
          const sessionResponse = await this.getSessionData();
          const user = this.mapSessionToUser(sessionResponse);

          this.currentUser = user;
          return {
            success: true,
            token: token,
            user: user
          };
        } catch (sessionError) {
          console.warn('Error al obtener sesión completa, usando datos del login:', sessionError);
          // Si falla la sesión, usar solo los datos del login
          const user: User = {
            id: loginResponse.data.user.userId?.toString() || '',
            email: loginResponse.data.user.userEmail || '',
            name: loginResponse.data.user.userEmail || ''
          };
          this.currentUser = user;
          return {
            success: true,
            token: token,
            user: user
          };
        }
      }

      // Si la respuesta no es exitosa, devolver error
      return {
        success: false,
        error: loginResponse?.message || 'Credenciales inválidas'
      };
    } catch (error: any) {
      console.error('Error en login:', error);

      // Si el error tiene una respuesta del servidor, intentar extraer el mensaje
      if (error?.error?.message) {
        return {
          success: false,
          error: error.error.message
        };
      }

      if (error?.message) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: false,
        error: 'Error al iniciar sesión. Intenta nuevamente.'
      };
    }
  }

  async logout(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('auth_token');
    }
    this.currentUser = null;
  }

  isAuthenticated(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    const token = localStorage.getItem('auth_token');
    const isAuth = !!token;
    return isAuth;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  /**
   * Inicializa el usuario desde el token guardado en localStorage
   * Se llama automáticamente cuando se recarga la página y hay un token válido
   */
  async initializeUserFromToken(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Evitar inicialización múltiple
    if (this.userInitialized) {
      return;
    }

    const token = localStorage.getItem('auth_token');
    if (!token) {
      this.userInitialized = true;
      return;
    }

    try {
      const sessionResponse = await this.getSessionData();
      const user = this.mapSessionToUser(sessionResponse);

      this.currentUser = user;
      this.userInitialized = true;
    } catch (error: any) {
      console.warn('No se pudo restaurar la sesión del usuario:', error);
      console.warn('Detalles del error:', {
        status: error?.status,
        message: error?.message,
        error: error?.error
      });

      // Solo limpiar el token si el servidor específicamente dice que es inválido (401/403)
      // O si la respuesta no tiene la estructura esperada (posible token corrupto)
      if (error?.status === 401 || error?.status === 403 || error?.message?.includes('Respuesta del servidor inválida')) {
        console.warn('Token inválido o respuesta inválida, limpiando sesión');
        if (isPlatformBrowser(this.platformId)) {
          localStorage.removeItem('auth_token');
        }
        this.currentUser = null;
      }
      // Si es otro tipo de error (red, timeout, etc.), mantener el token
      // El usuario podrá seguir usando la app si el token es válido

      this.userInitialized = true;
    }
  }

  /**
   * Obtiene los datos completos de la sesión desde el servidor
   */
  private async getSessionData(): Promise<any> {
    return await firstValueFrom(
      this.http.get<any>(`${this.apiUrl}/auth/session`)
    );
  }

  /**
   * Mapea la respuesta de la sesión a la interfaz User
   */
  private mapSessionToUser(sessionResponse: any): User {
    // Validar que la respuesta tenga la estructura esperada
    if (!sessionResponse?.userId || !sessionResponse?.userEmail) {
      console.error('Estructura de respuesta inesperada:', sessionResponse);
      throw new Error('Respuesta del servidor inválida: falta userId o userEmail');
    }

    // Construir nombre completo desde person
    let fullName = sessionResponse.userEmail;
    if (sessionResponse.person) {
      const parts: string[] = [];
      if (sessionResponse.person.personFirstname) parts.push(sessionResponse.person.personFirstname);
      if (sessionResponse.person.personLastname) parts.push(sessionResponse.person.personLastname);
      if (sessionResponse.person.personSecondLastname) parts.push(sessionResponse.person.personSecondLastname);
      if (parts.length > 0) {
        fullName = parts.join(' ');
      }
    }

    // Mapear Employee si existe
    let employee: Employee | undefined;
    if (sessionResponse.person?.employee) {
      const emp = sessionResponse.person.employee;
      employee = {
        employeeId: emp.employeeId,
        employeeCode: emp.employeeCode || '',
        employeeFirstName: emp.employeeFirstName || '',
        employeeLastName: emp.employeeLastName || '',
        employeeSecondLastName: emp.employeeSecondLastName,
        employeePayrollCode: emp.employeePayrollCode,
        employeeHireDate: emp.employeeHireDate,
        employeePhoto: emp.employeePhoto,
        employeeWorkSchedule: emp.employeeWorkSchedule,
        employeeTypeOfContract: emp.employeeTypeOfContract,
        employeeBusinessEmail: emp.employeeBusinessEmail,
        departmentId: emp.departmentId,
        positionId: emp.positionId,
        companyId: emp.companyId,
        businessUnitId: emp.businessUnitId
      };
    }

    // Mapear Person
    let person: Person | undefined;
    if (sessionResponse.person) {
      const p = sessionResponse.person;
      person = {
        personId: p.personId,
        personFirstname: p.personFirstname || '',
        personLastname: p.personLastname || '',
        personSecondLastname: p.personSecondLastname,
        personPhone: p.personPhone,
        personEmail: p.personEmail,
        personPhoneSecondary: p.personPhoneSecondary,
        personGender: p.personGender,
        personBirthday: p.personBirthday,
        personCurp: p.personCurp,
        personRfc: p.personRfc,
        personImssNss: p.personImssNss,
        personMaritalStatus: p.personMaritalStatus,
        personPlaceOfBirthCountry: p.personPlaceOfBirthCountry,
        personPlaceOfBirthState: p.personPlaceOfBirthState,
        personPlaceOfBirthCity: p.personPlaceOfBirthCity,
        employee: employee
      };
    }

    const user: User = {
      id: sessionResponse.userId?.toString() || '',
      email: sessionResponse.userEmail || '',
      name: fullName,
      ...(employee && { employeeId: employee.employeeId }),
      person: person
    };

    return user;
  }
}

