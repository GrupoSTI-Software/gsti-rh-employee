import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import {
  IAuthPort,
  IAuthResult,
  IUser,
  IPerson,
  IEmployee,
  IDeviceInfo,
  IPasskeyRegistrationOptions,
  IPasskeyAuthenticationOptions,
} from '../domain/auth.port';
import { environment } from '@env/environment';
import { SecureStorageService } from '@core/services/secure-storage.service';
import { JwtService } from '@core/services/jwt.service';
import { LoggerService } from '@core/services/logger.service';
import { WebAuthnAdapter } from './webauthn.adapter';
import { PushNotificationsService } from '@core/services/push-notifications.service';

/**
 * Constante para el nombre de la cookie del token de autenticación
 */
const AUTH_TOKEN_COOKIE = 'auth_token';

/**
 * Constante para la clave de datos de usuario cifrados
 */
const USER_DATA_KEY = 'user_session';

/**
 * Interfaces para las respuestas de la API (específicas de esta implementación)
 */
interface ILoginUserData {
  userId?: number;
  userEmail?: string;
}

interface ILoginResponse {
  type: string;
  title: string;
  message: string;
  data: {
    token: string;
    user: ILoginUserData;
  };
}

interface IFcmTokenResponse {
  type: string;
  title: string;
  message: string;
  data: {
    token: string;
  };
}
interface ISessionEmployeeData {
  employeeId: number;
  employeeCode?: string;
  employeeFirstName?: string;
  employeeLastName?: string;
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

interface ISessionPersonData {
  personId: number;
  personFirstname?: string;
  personLastname?: string;
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
  employee?: ISessionEmployeeData;
}

interface ISessionResponse {
  userId: number;
  userEmail: string;
  person?: ISessionPersonData;
}

/**
 * Adaptador HTTP para autenticación
 * Implementa el puerto AuthPort usando HTTP
 */
@Injectable({
  providedIn: 'root',
})
export class HttpAuthAdapter implements IAuthPort {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly secureStorage = inject(SecureStorageService);
  private readonly jwtService = inject(JwtService);
  private readonly logger = inject(LoggerService);
  private readonly webAuthnAdapter = inject(WebAuthnAdapter);
  private readonly pushNotificationsService = inject(PushNotificationsService);
  private readonly apiUrl = environment.API_URL;
  private currentUser: IUser | null = null;
  private userInitialized = false;

  async login(email: string, password: string, deviceInfo?: IDeviceInfo): Promise<IAuthResult> {
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
        userPassword: password,
      };

      // Agregar información del dispositivo si está disponible
      if (deviceInfo) {
        payload.deviceToken = deviceInfo.deviceToken;
        payload.deviceBrand = deviceInfo.deviceBrand;
        payload.deviceModel = deviceInfo.deviceModel;
        payload.deviceOs = deviceInfo.deviceOs;
        payload.deviceType = deviceInfo.deviceType;
      }

      const loginResponse = await firstValueFrom(
        this.http.post<ILoginResponse>(`${this.apiUrl}/auth/login`, payload),
      );
      // Verificar que la respuesta sea exitosa
      if (
        loginResponse?.type === 'success' &&
        loginResponse?.data?.token !== undefined &&
        loginResponse?.data?.user !== undefined
      ) {
        const token = loginResponse.data.token;

        // Validar formato del token antes de guardarlo
        if (!this.jwtService.isValidFormat(token)) {
          this.logger.error('Token recibido con formato inválido');
          return {
            success: false,
            error: 'Error de autenticación: token inválido',
          };
        }

        // Verificar que el token no esté expirado
        if (this.jwtService.isExpired(token)) {
          this.logger.error('Token recibido ya expirado');
          return {
            success: false,
            error: 'Error de autenticación: sesión expirada',
          };
        }

        // Guardar token en cookie segura
        if (isPlatformBrowser(this.platformId)) {
          // Calcular días hasta expiración para la cookie
          const daysUntilExpiry = Math.max(
            1,
            Math.floor(this.jwtService.getTimeUntilExpiry(token) / 86400),
          );
          this.secureStorage.setSecureCookie(AUTH_TOKEN_COOKIE, token, daysUntilExpiry);
        }
        // Obtener información completa del usuario desde /auth/session
        try {
          const sessionResponse = await this.getSessionData();
          const user = this.mapSessionToUser(sessionResponse);

          this.currentUser = user;
          await this.pushNotificationsService.getToken();
          // Guardar datos del usuario cifrados (sin datos ultra-sensibles)
          this.storeUserDataSecurely(user);
          const fcmToken = this.secureStorage.getItem('fcmToken');
          if (fcmToken) {
            const fcmTokenPayload: {
              userId: number;
              userFcmToken: string;
              userFcmActive: number;
              userFcmTokenPlatform?: string;
            } = {
              userId: Number(this.currentUser?.id) ?? 0,
              userFcmToken: this.secureStorage.getItem('fcmToken') ?? '',
              userFcmActive: 1,
              userFcmTokenPlatform: 'app',
            };
            await firstValueFrom(
              this.http.post<IFcmTokenResponse>(`${this.apiUrl}/user-fcm-tokens`, fcmTokenPayload),
            );
          }
          return {
            success: true,
            token: token,
            user: user,
          };
        } catch (_sessionError) {
          this.logger.warn('Error al obtener sesión completa, usando datos del login');
          // Si falla la sesión, usar solo los datos del login
          const userData = loginResponse.data.user;
          const user: IUser = {
            id: userData.userId?.toString() ?? '',
            email: userData.userEmail ?? '',
            name: userData.userEmail ?? '',
          };
          this.currentUser = user;
          this.storeUserDataSecurely(user);

          return {
            success: true,
            token: token,
            user: user,
          };
        }
      }

      // Si la respuesta no es exitosa, devolver error
      return {
        success: false,
        error: loginResponse?.message || 'Credenciales inválidas',
      };
    } catch (error: unknown) {
      this.logger.error('Error en login');

      // Si el error tiene una respuesta del servidor, intentar extraer el mensaje
      if (error instanceof HttpErrorResponse) {
        const errorBody = error.error as { message?: string } | null;
        if (errorBody?.message !== undefined) {
          return {
            success: false,
            error: errorBody.message,
          };
        }
      }

      if (error instanceof Error && error.message.length > 0) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: 'Error al iniciar sesión. Intenta nuevamente.',
      };
    }
  }

  async logout(): Promise<void> {
    if (isPlatformBrowser(this.platformId)) {
      // Limpiar todos los datos de forma segura
      const DEVICE_TOKEN_KEY = 'device_token';
      // Limpiar todos los datos de forma segura
      const systemToken = this.secureStorage.getItem(DEVICE_TOKEN_KEY);

      this.secureStorage.clearAllSecureData();
      // restaurar
      if (systemToken) {
        this.secureStorage.setItem(DEVICE_TOKEN_KEY, systemToken);
      }
    }
    this.currentUser = null;
    this.userInitialized = false;
  }

  isAuthenticated(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }

    // Intentar obtener token de cookie con prefijo
    const token = this.secureStorage.getCookie(AUTH_TOKEN_COOKIE);

    if (!token || token.length === 0) {
      return false;
    }

    // Validar formato del token
    if (!this.jwtService.isValidFormat(token)) {
      this.logger.warn('Token con formato inválido encontrado, limpiando sesión');
      this.secureStorage.deleteCookie(AUTH_TOKEN_COOKIE);
      return false;
    }

    // Verificar que el token no esté expirado
    if (this.jwtService.isExpired(token)) {
      this.logger.info('Token expirado, limpiando sesión');
      this.secureStorage.deleteCookie(AUTH_TOKEN_COOKIE);
      return false;
    }

    return true;
  }

  /**
   * Obtiene el token actual si es válido
   */
  getToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const token = this.secureStorage.getCookie(AUTH_TOKEN_COOKIE);

    if (!token || !this.jwtService.isValidFormat(token) || this.jwtService.isExpired(token)) {
      return null;
    }

    return token;
  }

  getCurrentUser(): IUser | null {
    // Si ya tenemos el usuario en memoria, devolverlo
    if (this.currentUser) {
      return this.currentUser;
    }

    // Intentar recuperar de almacenamiento seguro
    if (isPlatformBrowser(this.platformId)) {
      const storedUser = this.retrieveUserDataSecurely();
      if (storedUser) {
        this.currentUser = storedUser;
        return storedUser;
      }
    }

    return null;
  }

  /**
   * Inicializa el usuario desde el token guardado
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

    // Verificar si hay token válido
    if (!this.isAuthenticated()) {
      this.userInitialized = true;
      return;
    }

    // Intentar recuperar usuario de almacenamiento seguro primero
    const storedUser = this.retrieveUserDataSecurely();
    if (storedUser) {
      this.currentUser = storedUser;
      this.userInitialized = true;

      // Actualizar datos en segundo plano si el token no está próximo a expirar
      const token = this.getToken();
      if (token && !this.jwtService.isAboutToExpire(token, 600)) {
        // 10 minutos
        this.refreshUserDataInBackground();
      }
      return;
    }

    // Si no hay datos guardados, obtener del servidor
    try {
      const sessionResponse = await this.getSessionData();
      const user = this.mapSessionToUser(sessionResponse);

      this.currentUser = user;
      this.storeUserDataSecurely(user);
      this.userInitialized = true;
    } catch (error: unknown) {
      this.logger.warn('No se pudo restaurar la sesión del usuario');

      const httpError = error instanceof HttpErrorResponse ? error : null;

      // Solo limpiar el token si el servidor específicamente dice que es inválido (401/403)
      const isUnauthorized = httpError?.status === 401 || httpError?.status === 403;

      if (isUnauthorized) {
        this.logger.info('Token inválido, limpiando sesión');
        this.secureStorage.clearAllSecureData();
        this.currentUser = null;
      }

      this.userInitialized = true;
    }
  }

  /**
   * Actualiza los datos del usuario en segundo plano
   */
  private refreshUserDataInBackground(): void {
    this.getSessionData()
      .then((sessionResponse) => {
        const user = this.mapSessionToUser(sessionResponse);
        this.currentUser = user;
        this.storeUserDataSecurely(user);
      })
      .catch(() => {
        // Ignorar errores en actualización de fondo
      });
  }

  /**
   * Almacena datos del usuario de forma segura
   * Excluye datos ultra-sensibles como CURP, RFC, NSS
   */
  private storeUserDataSecurely(user: IUser): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    // Crear una versión sin datos ultra-sensibles para almacenar
    const safeUser: IUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      employeeId: user.employeeId,
    };

    // Incluir datos de persona sin campos sensibles
    if (user.person) {
      safeUser.person = {
        personId: user.person.personId,
        personFirstname: user.person.personFirstname,
        personLastname: user.person.personLastname,
        personSecondLastname: user.person.personSecondLastname,
        personPhone: user.person.personPhone,
        personEmail: user.person.personEmail,
        personGender: user.person.personGender,
        personBirthday: user.person.personBirthday,
        personMaritalStatus: user.person.personMaritalStatus,
        personPlaceOfBirthCountry: user.person.personPlaceOfBirthCountry,
        personPlaceOfBirthState: user.person.personPlaceOfBirthState,
        personPlaceOfBirthCity: user.person.personPlaceOfBirthCity,
        // Excluir: personCurp, personRfc, personImssNss
        employee: user.person.employee,
      };
    }

    const userData = JSON.stringify(safeUser);
    this.secureStorage.setEncryptedItem(USER_DATA_KEY, userData);
  }

  /**
   * Recupera datos del usuario de forma segura
   */
  private retrieveUserDataSecurely(): IUser | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }

    const userData = this.secureStorage.getEncryptedItem(USER_DATA_KEY);
    if (!userData) {
      return null;
    }

    try {
      return JSON.parse(userData) as IUser;
    } catch {
      return null;
    }
  }

  /**
   * Obtiene los datos completos de la sesión desde el servidor
   */
  private async getSessionData(): Promise<ISessionResponse> {
    return await firstValueFrom(this.http.get<ISessionResponse>(`${this.apiUrl}/auth/session`));
  }

  /**
   * Mapea la respuesta de la sesión a la interfaz IUser
   */
  private mapSessionToUser(sessionResponse: ISessionResponse): IUser {
    // Validar que la respuesta tenga la estructura esperada
    if (sessionResponse.userId === undefined || sessionResponse.userEmail === undefined) {
      this.logger.error('Estructura de respuesta inesperada');
      throw new Error('Respuesta del servidor inválida: falta userId o userEmail');
    }

    // Construir nombre completo desde person
    let fullName = sessionResponse.userEmail;
    if (sessionResponse.person !== undefined) {
      const parts: string[] = [];
      const personData = sessionResponse.person;
      if (personData.personFirstname !== undefined && personData.personFirstname.length > 0) {
        parts.push(personData.personFirstname);
      }
      if (personData.personLastname !== undefined && personData.personLastname.length > 0) {
        parts.push(personData.personLastname);
      }
      if (
        personData.personSecondLastname !== undefined &&
        personData.personSecondLastname.length > 0
      ) {
        parts.push(personData.personSecondLastname);
      }
      if (parts.length > 0) {
        fullName = parts.join(' ');
      }
    }

    // Mapear Employee si existe
    let employee: IEmployee | undefined = undefined;
    if (sessionResponse.person?.employee !== undefined) {
      const emp = sessionResponse.person.employee;
      employee = {
        employeeId: emp.employeeId,
        employeeCode: emp.employeeCode ?? '',
        employeeFirstName: emp.employeeFirstName ?? '',
        employeeLastName: emp.employeeLastName ?? '',
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
        businessUnitId: emp.businessUnitId,
      };
    }

    // Mapear Person
    let person: IPerson | undefined;
    if (sessionResponse.person !== undefined) {
      const p = sessionResponse.person;
      person = {
        personId: p.personId,
        personFirstname: p.personFirstname ?? '',
        personLastname: p.personLastname ?? '',
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
        employee: employee,
      };
    }

    const user: IUser = {
      id: sessionResponse.userId.toString(),
      email: sessionResponse.userEmail,
      name: fullName,
      ...(employee !== undefined && { employeeId: employee.employeeId }),
      person: person,
    };

    return user;
  }

  /**
   * Solicita las opciones de registro de Passkey desde el servidor
   */
  async requestPasskeyRegistrationOptions(email: string): Promise<IPasskeyRegistrationOptions> {
    try {
      const response = await firstValueFrom(
        this.http.post<IPasskeyRegistrationOptions>(
          `${this.apiUrl}/auth/passkey/register/options`,
          { email },
        ),
      );
      return response;
    } catch (error: unknown) {
      this.logger.error('Error al solicitar opciones de registro de Passkey');
      if (error instanceof HttpErrorResponse) {
        const errorBody = error.error as { message?: string } | null;
        throw new Error(errorBody?.message ?? 'Error al obtener opciones de registro de Passkey');
      }
      throw new Error('Error al obtener opciones de registro de Passkey');
    }
  }

  /**
   * Completa el registro de una Passkey en el servidor
   */
  async completePasskeyRegistration(
    email: string,
    credential: PublicKeyCredential,
    deviceName?: string,
  ): Promise<IAuthResult> {
    try {
      // Serializar la credencial para enviarla al servidor
      const serializedCredential =
        this.webAuthnAdapter.serializeCredentialForRegistration(credential);

      const payload = {
        email,
        credential: serializedCredential,
        deviceName: deviceName ?? 'Dispositivo sin nombre',
      };

      const response = await firstValueFrom(
        this.http.post<{ type: string; message: string }>(
          `${this.apiUrl}/auth/passkey/register/complete`,
          payload,
        ),
      );

      if (response.type === 'success') {
        return {
          success: true,
        };
      }

      return {
        success: false,
        error: response.message ?? 'Error al registrar la Passkey',
      };
    } catch (error: unknown) {
      this.logger.error('Error al completar el registro de Passkey');
      if (error instanceof HttpErrorResponse) {
        const errorBody = error.error as { message?: string } | null;
        return {
          success: false,
          error: errorBody?.message ?? 'Error al registrar la Passkey',
        };
      }
      return {
        success: false,
        error: 'Error al registrar la Passkey',
      };
    }
  }

  /**
   * Solicita las opciones de autenticación con Passkey desde el servidor
   */
  async requestPasskeyAuthenticationOptions(
    email?: string,
  ): Promise<IPasskeyAuthenticationOptions> {
    try {
      const payload = email ? { email } : {};
      const response = await firstValueFrom(
        this.http.post<IPasskeyAuthenticationOptions>(
          `${this.apiUrl}/auth/passkey/login/options`,
          payload,
        ),
      );
      return response;
    } catch (error: unknown) {
      this.logger.error('Error al solicitar opciones de autenticación con Passkey');
      if (error instanceof HttpErrorResponse) {
        const errorBody = error.error as { message?: string } | null;
        throw new Error(errorBody?.message ?? 'Error al autenticar con Passkey');
      }
      throw new Error('Error al autenticar con Passkey');
    }
  }

  /**
   * Completa la autenticación con Passkey
   */
  async completePasskeyAuthentication(
    credential: PublicKeyCredential,
    deviceInfo?: IDeviceInfo,
    email?: string,
  ): Promise<IAuthResult> {
    try {
      // Serializar la credencial para enviarla al servidor
      const serializedCredential =
        this.webAuthnAdapter.serializeCredentialForAuthentication(credential);

      const payload: {
        credential: ReturnType<
          InstanceType<
            typeof HttpAuthAdapter
          >['webAuthnAdapter']['serializeCredentialForAuthentication']
        >;
        email?: string;
        deviceToken?: string;
        deviceBrand?: string | null;
        deviceModel?: string;
        deviceOs?: string;
        deviceType?: string | null;
      } = {
        credential: serializedCredential,
      };

      // Agregar email si está disponible (para vincular con el challenge)
      if (email) {
        payload.email = email;
      }

      // Agregar información del dispositivo si está disponible
      if (deviceInfo) {
        payload.deviceToken = deviceInfo.deviceToken;
        payload.deviceBrand = deviceInfo.deviceBrand;
        payload.deviceModel = deviceInfo.deviceModel;
        payload.deviceOs = deviceInfo.deviceOs;
        payload.deviceType = deviceInfo.deviceType;
      }

      const loginResponse = await firstValueFrom(
        this.http.post<ILoginResponse>(`${this.apiUrl}/auth/passkey/login/complete`, payload),
      );

      // Verificar que la respuesta sea exitosa
      if (
        loginResponse?.type === 'success' &&
        loginResponse?.data?.token !== undefined &&
        loginResponse?.data?.user !== undefined
      ) {
        const token = loginResponse.data.token;

        // Validar formato del token antes de guardarlo
        if (!this.jwtService.isValidFormat(token)) {
          this.logger.error('Token recibido con formato inválido');
          return {
            success: false,
            error: 'Error de autenticación: token inválido',
          };
        }

        // Verificar que el token no esté expirado
        if (this.jwtService.isExpired(token)) {
          this.logger.error('Token recibido ya expirado');
          return {
            success: false,
            error: 'Error de autenticación: sesión expirada',
          };
        }

        // Guardar token en cookie segura
        if (isPlatformBrowser(this.platformId)) {
          // Calcular días hasta expiración para la cookie
          const daysUntilExpiry = Math.max(
            1,
            Math.floor(this.jwtService.getTimeUntilExpiry(token) / 86400),
          );
          this.secureStorage.setSecureCookie(AUTH_TOKEN_COOKIE, token, daysUntilExpiry);
        }

        // Obtener información completa del usuario desde /auth/session
        try {
          const sessionResponse = await this.getSessionData();
          const user = this.mapSessionToUser(sessionResponse);

          this.currentUser = user;

          // Guardar datos del usuario cifrados (sin datos ultra-sensibles)
          this.storeUserDataSecurely(user);

          return {
            success: true,
            token: token,
            user: user,
          };
        } catch (_sessionError) {
          this.logger.warn('Error al obtener sesión completa, usando datos del login');
          // Si falla la sesión, usar solo los datos del login
          const userData = loginResponse.data.user;
          const user: IUser = {
            id: userData.userId?.toString() ?? '',
            email: userData.userEmail ?? '',
            name: userData.userEmail ?? '',
          };
          this.currentUser = user;
          this.storeUserDataSecurely(user);

          return {
            success: true,
            token: token,
            user: user,
          };
        }
      }

      // Si la respuesta no es exitosa, devolver error
      return {
        success: false,
        error: loginResponse?.message ?? 'Error al autenticar con Passkey',
      };
    } catch (error: unknown) {
      this.logger.error('Error en autenticación con Passkey');

      // Si el error tiene una respuesta del servidor, intentar extraer el mensaje
      if (error instanceof HttpErrorResponse) {
        const errorBody = error.error as { message?: string } | null;
        if (errorBody?.message !== undefined) {
          return {
            success: false,
            error: errorBody.message,
          };
        }
      }

      if (error instanceof Error && error.message.length > 0) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: false,
        error: 'Error al autenticar con Passkey. Intenta nuevamente.',
      };
    }
  }

  /**
   * Verifica si el navegador soporta Passkeys (WebAuthn)
   */
  isPasskeySupported(): boolean {
    return this.webAuthnAdapter.isWebAuthnSupported();
  }

  /**
   * Verifica si el usuario tiene Passkeys registradas
   */
  async hasPasskeys(email: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.http.post<{ hasPasskeys: boolean }>(`${this.apiUrl}/auth/passkey/check`, { email }),
      );
      return response.hasPasskeys;
    } catch {
      // Si hay error, asumir que no tiene passkeys
      return false;
    }
  }
}
