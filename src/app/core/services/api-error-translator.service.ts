import { inject, Injectable, Injector } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

/**
 * Servicio para traducir mensajes de error del API al idioma del usuario.
 * Usa Injector lazy para obtener TranslateService y evitar dependencias circulares
 * en el árbol de inyección de dependencias.
 */
@Injectable({
  providedIn: 'root',
})
export class ApiErrorTranslatorService {
  private readonly injector = inject(Injector);

  /**
   * Referencia lazy a TranslateService para evitar dependencias circulares.
   * Se inicializa la primera vez que se necesita.
   */
  private _translateService: TranslateService | null = null;

  private get translateService(): TranslateService {
    this._translateService ??= this.injector.get(TranslateService);
    return this._translateService;
  }

  /**
   * Traducciones inline de respaldo, organizadas por idioma.
   * Se usan cuando TranslateService aún no tiene el archivo JSON cargado.
   */
  private readonly inlineFallbacks: Record<string, Record<string, string>> = {
    es: {
      'apiErrors.generic': 'Ha ocurrido un error. Por favor intenta nuevamente',
      'apiErrors.invalidCredentials': 'Correo electrónico o contraseña incorrectos',
      'apiErrors.accountRegisteredOnAnotherDevice':
        'Esta cuenta ya está registrada en otro dispositivo. Por favor, contacta a tu gerente para activar el acceso en este nuevo dispositivo.',
      'apiErrors.employeeNotFound': 'Empleado no encontrado',
      'apiErrors.userNotFound': 'Usuario no encontrado',
      'apiErrors.incorrectPassword': 'Contraseña incorrecta',
      'apiErrors.invalidToken': 'Token inválido',
      'apiErrors.expiredToken': 'Token expirado',
      'apiErrors.sessionExpired': 'Tu sesión ha expirado',
      'apiErrors.unauthorized': 'No autorizado',
      'apiErrors.emailRequired': 'El correo electrónico es requerido',
      'apiErrors.emailInvalid': 'El formato del correo no es válido',
      'apiErrors.passwordRequired': 'La contraseña es requerida',
      'apiErrors.passwordMinLength': 'La contraseña debe tener al menos 6 caracteres',
      'apiErrors.recoveryEmailError': 'Error al enviar correo de recuperación',
      'apiErrors.invalidVerificationCode': 'Código de verificación inválido',
      'apiErrors.expiredVerificationCode': 'Código de verificación expirado',
      'apiErrors.passkeyRegistrationError': 'Error al registrar la biometría',
      'apiErrors.passkeyAuthenticationError': 'Error al autenticar con biometría',
      'apiErrors.passkeyNotFound': 'Biometría no encontrada',
      'apiErrors.attendanceRegistrationError': 'Error al registrar asistencia',
      'apiErrors.locationOutOfRange': 'Ubicación fuera de rango',
      'apiErrors.attendanceAlreadyExists': 'Ya existe un registro de asistencia',
      'apiErrors.noVacationDaysAvailable': 'No hay días de vacaciones disponibles',
      'apiErrors.vacationPeriodNotFound': 'Periodo de vacaciones no encontrado',
      'apiErrors.vacationRequestAlreadyExists':
        'Ya existe una solicitud de vacaciones para esta fecha',
      'apiErrors.exceptionRequestAlreadyExists':
        'Ya existe una solicitud de excepción para esta fecha',
      'apiErrors.exceptionTypeNotFound': 'Tipo de excepción no encontrado',
      'apiErrors.internalServerError': 'Error interno del servidor',
      'apiErrors.resourceNotFound': 'Recurso no encontrado',
      'apiErrors.accessDenied': 'Acceso denegado',
      'apiErrors.insufficientPermissions': 'Permisos insuficientes',
      'apiErrors.connectionError': 'Error de conexión',
      'apiErrors.timeout': 'Tiempo de espera agotado',
    },
    en: {
      'apiErrors.generic': 'An error occurred. Please try again',
      'apiErrors.invalidCredentials': 'Incorrect email or password',
      'apiErrors.accountRegisteredOnAnotherDevice':
        'This account is already registered on another device. Please contact your manager to activate access on this new device.',
      'apiErrors.employeeNotFound': 'Employee not found',
      'apiErrors.userNotFound': 'User not found',
      'apiErrors.incorrectPassword': 'Incorrect password',
      'apiErrors.invalidToken': 'Invalid token',
      'apiErrors.expiredToken': 'Token expired',
      'apiErrors.sessionExpired': 'Your session has expired',
      'apiErrors.unauthorized': 'Unauthorized',
      'apiErrors.emailRequired': 'Email is required',
      'apiErrors.emailInvalid': 'Email format is not valid',
      'apiErrors.passwordRequired': 'Password is required',
      'apiErrors.passwordMinLength': 'Password must be at least 6 characters',
      'apiErrors.recoveryEmailError': 'Error sending recovery email',
      'apiErrors.invalidVerificationCode': 'Invalid verification code',
      'apiErrors.expiredVerificationCode': 'Verification code expired',
      'apiErrors.passkeyRegistrationError': 'Error registering biometrics',
      'apiErrors.passkeyAuthenticationError': 'Error authenticating with biometrics',
      'apiErrors.passkeyNotFound': 'Biometrics not found',
      'apiErrors.attendanceRegistrationError': 'Error registering attendance',
      'apiErrors.locationOutOfRange': 'Location out of range',
      'apiErrors.attendanceAlreadyExists': 'Attendance record already exists',
      'apiErrors.noVacationDaysAvailable': 'No vacation days available',
      'apiErrors.vacationPeriodNotFound': 'Vacation period not found',
      'apiErrors.vacationRequestAlreadyExists': 'Vacation request already exists for this date',
      'apiErrors.exceptionRequestAlreadyExists': 'Exception request already exists for this date',
      'apiErrors.exceptionTypeNotFound': 'Exception type not found',
      'apiErrors.internalServerError': 'Internal server error',
      'apiErrors.resourceNotFound': 'Resource not found',
      'apiErrors.accessDenied': 'Access denied',
      'apiErrors.insufficientPermissions': 'Insufficient permissions',
      'apiErrors.connectionError': 'Connection error',
      'apiErrors.timeout': 'Request timeout',
    },
  };

  /**
   * Mapa de mensajes exactos del API a claves de traducción i18n
   */
  private readonly errorMappings: Record<string, string> = {
    // Autenticación
    'Incorrect email or password': 'apiErrors.invalidCredentials',
    'Correo electrónico o contraseña incorrectos': 'apiErrors.invalidCredentials',
    'Credenciales inválidas': 'apiErrors.invalidCredentials',
    'Invalid credentials': 'apiErrors.invalidCredentials',
    'Invalid user credentials': 'apiErrors.invalidCredentials',
    'This account is already registered on another device. Please contact your manager to activate access on this new device.':
      'apiErrors.accountRegisteredOnAnotherDevice',
    'Esta cuenta ya está registrada en otro dispositivo. Por favor, contacta a tu gerente para activar el acceso en este nuevo dispositivo.':
      'apiErrors.accountRegisteredOnAnotherDevice',
    'Employee not found': 'apiErrors.employeeNotFound',
    'Empleado no encontrado': 'apiErrors.employeeNotFound',
    'User not found': 'apiErrors.userNotFound',
    'Usuario no encontrado': 'apiErrors.userNotFound',
    'Incorrect password': 'apiErrors.incorrectPassword',
    'Contraseña incorrecta': 'apiErrors.incorrectPassword',
    'Invalid token': 'apiErrors.invalidToken',
    'Token inválido': 'apiErrors.invalidToken',
    'Expired token': 'apiErrors.expiredToken',
    'Token expirado': 'apiErrors.expiredToken',
    'Session expired': 'apiErrors.sessionExpired',
    'Sesión expirada': 'apiErrors.sessionExpired',
    Unauthorized: 'apiErrors.unauthorized',
    'No autorizado': 'apiErrors.unauthorized',

    // Validación
    'Email is required': 'apiErrors.emailRequired',
    'El correo electrónico es requerido': 'apiErrors.emailRequired',
    'Invalid email format': 'apiErrors.emailInvalid',
    'El correo electrónico no es válido': 'apiErrors.emailInvalid',
    'Password is required': 'apiErrors.passwordRequired',
    'La contraseña es requerida': 'apiErrors.passwordRequired',
    'Password must be at least 6 characters': 'apiErrors.passwordMinLength',
    'La contraseña debe tener al menos 6 caracteres': 'apiErrors.passwordMinLength',

    // Recuperación de contraseña
    'Error sending recovery email': 'apiErrors.recoveryEmailError',
    'Error al enviar correo de recuperación': 'apiErrors.recoveryEmailError',
    'Invalid verification code': 'apiErrors.invalidVerificationCode',
    'Código de verificación inválido': 'apiErrors.invalidVerificationCode',
    'Verification code expired': 'apiErrors.expiredVerificationCode',
    'Código de verificación expirado': 'apiErrors.expiredVerificationCode',

    // Biometría / Passkey
    'Error registering passkey': 'apiErrors.passkeyRegistrationError',
    'Error al registrar la biometría': 'apiErrors.passkeyRegistrationError',
    'Error authenticating with passkey': 'apiErrors.passkeyAuthenticationError',
    'Error al autenticar con biometría': 'apiErrors.passkeyAuthenticationError',
    'Passkey not found': 'apiErrors.passkeyNotFound',
    'Biometría no encontrada': 'apiErrors.passkeyNotFound',

    // Asistencia
    'Error registering attendance': 'apiErrors.attendanceRegistrationError',
    'Error al registrar asistencia': 'apiErrors.attendanceRegistrationError',
    'Location out of range': 'apiErrors.locationOutOfRange',
    'Ubicación fuera de rango': 'apiErrors.locationOutOfRange',
    'Attendance record already exists': 'apiErrors.attendanceAlreadyExists',
    'Ya existe un registro de asistencia': 'apiErrors.attendanceAlreadyExists',

    // Vacaciones
    'No vacation days available': 'apiErrors.noVacationDaysAvailable',
    'No hay días disponibles': 'apiErrors.noVacationDaysAvailable',
    'Vacation period not found': 'apiErrors.vacationPeriodNotFound',
    'Periodo de vacaciones no encontrado': 'apiErrors.vacationPeriodNotFound',
    'Vacation request already exists': 'apiErrors.vacationRequestAlreadyExists',
    'Solicitud de vacaciones ya existe': 'apiErrors.vacationRequestAlreadyExists',

    // Excepciones
    'Exception request already exists': 'apiErrors.exceptionRequestAlreadyExists',
    'Solicitud de excepción ya existe': 'apiErrors.exceptionRequestAlreadyExists',
    'Exception type not found': 'apiErrors.exceptionTypeNotFound',
    'Tipo de excepción no encontrado': 'apiErrors.exceptionTypeNotFound',

    // Servidor / Genéricos
    'Internal server error': 'apiErrors.internalServerError',
    'Error interno del servidor': 'apiErrors.internalServerError',
    'Resource not found': 'apiErrors.resourceNotFound',
    'Recurso no encontrado': 'apiErrors.resourceNotFound',
    'Access denied': 'apiErrors.accessDenied',
    'Acceso denegado': 'apiErrors.accessDenied',
    'Insufficient permissions': 'apiErrors.insufficientPermissions',
    'Permisos insuficientes': 'apiErrors.insufficientPermissions',
    'Connection error': 'apiErrors.connectionError',
    'Error de conexión': 'apiErrors.connectionError',
    'Request timeout': 'apiErrors.timeout',
    'Tiempo de espera agotado': 'apiErrors.timeout',
  };

  /**
   * Traduce un mensaje de error del API al idioma activo del usuario.
   * Usa TranslateService como fuente principal y las traducciones inline como fallback.
   */
  translateError(apiErrorMessage: string): string {
    if (!apiErrorMessage?.trim()) {
      return this.resolveKey('apiErrors.generic');
    }

    // Coincidencia exacta
    const exactKey = this.errorMappings[apiErrorMessage];
    if (exactKey) {
      return this.resolveKey(exactKey);
    }

    // Coincidencia parcial (case-insensitive)
    const lower = apiErrorMessage.toLowerCase();
    for (const [pattern, key] of Object.entries(this.errorMappings)) {
      if (lower.includes(pattern.toLowerCase())) {
        return this.resolveKey(key);
      }
    }

    // Sin mapeo: devolver el mensaje original del API
    return apiErrorMessage;
  }

  /**
   * Resuelve una clave de traducción usando TranslateService.
   * Si instant() devuelve la clave misma (JSON aún no cargado), usa el fallback inline.
   */
  private resolveKey(key: string): string {
    try {
      const translated = this.translateService.instant(key);

      // Si instant() devuelve la clave tal cual, las traducciones no están cargadas aún
      if (translated === key) {
        const lang = this.translateService.currentLang ?? this.translateService.defaultLang ?? 'es';
        const langFallbacks = this.inlineFallbacks[lang] ?? this.inlineFallbacks['es'];
        return langFallbacks[key] ?? key;
      }

      return translated;
    } catch {
      // Si TranslateService falla por cualquier razón, usar fallback inline
      const langFallbacks = this.inlineFallbacks['es'];
      return langFallbacks[key] ?? key;
    }
  }

  /**
   * Agrega un mapeo dinámico en tiempo de ejecución
   */
  addErrorMapping(apiMessage: string, translationKey: string): void {
    this.errorMappings[apiMessage] = translationKey;
  }
}
