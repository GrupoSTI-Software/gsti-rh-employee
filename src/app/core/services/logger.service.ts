import { Injectable } from '@angular/core';
import { environment } from '@env/environment';

/**
 * Niveles de log permitidos
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Servicio de logging seguro
 * Solo muestra logs en desarrollo, nunca en producción
 */
@Injectable({
  providedIn: 'root',
})
export class LoggerService {
  private readonly isProduction = environment.PRODUCTION;

  /**
   * Log de debug (solo desarrollo)
   */
  debug(message: string, ...optionalParams: unknown[]): void {
    this.log('debug', message, optionalParams);
  }

  /**
   * Log de información (solo desarrollo)
   */
  info(message: string, ...optionalParams: unknown[]): void {
    this.log('info', message, optionalParams);
  }

  /**
   * Log de advertencia (solo desarrollo)
   */
  warn(message: string, ...optionalParams: unknown[]): void {
    this.log('warn', message, optionalParams);
  }

  /**
   * Log de error (solo desarrollo)
   * En producción, considera enviar a un servicio de monitoreo
   */
  error(message: string, ...optionalParams: unknown[]): void {
    this.log('error', message, optionalParams);

    // En producción, aquí podrías enviar errores a un servicio externo
    // como Sentry, LogRocket, etc.
    // this.sendToErrorMonitoring(message, optionalParams);
  }

  /**
   * Método interno de logging
   */
  private log(level: LogLevel, message: string, optionalParams: unknown[]): void {
    // En producción, no mostrar ningún log en la consola
    if (this.isProduction) {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    // Sanitizar datos sensibles antes de loguear
    const sanitizedParams = this.sanitizeParams(optionalParams);

    /* eslint-disable no-console */
    switch (level) {
      case 'debug':
        console.debug(prefix, message, ...sanitizedParams);
        break;
      case 'info':
        console.info(prefix, message, ...sanitizedParams);
        break;
      case 'warn':
        console.warn(prefix, message, ...sanitizedParams);
        break;
      case 'error':
        console.error(prefix, message, ...sanitizedParams);
        break;
    }
    /* eslint-enable no-console */
  }

  /**
   * Sanitiza parámetros para no exponer datos sensibles
   */
  private sanitizeParams(params: unknown[]): unknown[] {
    return params.map((param) => this.sanitizeValue(param));
  }

  /**
   * Sanitiza un valor individual
   */
  private sanitizeValue(value: unknown): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    if (typeof value === 'string') {
      return this.sanitizeString(value);
    }

    if (typeof value === 'object') {
      return this.sanitizeObject(value as Record<string, unknown>);
    }

    return value;
  }

  /**
   * Sanitiza un string, ocultando posibles tokens o datos sensibles
   */
  private sanitizeString(value: string): string {
    // Ocultar tokens JWT
    if (value.match(/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)) {
      return '[JWT_TOKEN_HIDDEN]';
    }

    // Ocultar emails parcialmente
    const emailRegex = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    value = value.replace(emailRegex, (match, local, domain) => {
      const maskedLocal = local.substring(0, 2) + '***';
      return `${maskedLocal}@${domain}`;
    });

    return value;
  }

  /**
   * Sanitiza un objeto, ocultando campos sensibles
   */
  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = [
      'password',
      'token',
      'auth_token',
      'accessToken',
      'refreshToken',
      'secret',
      'apiKey',
      'curp',
      'rfc',
      'nss',
      'imss',
      'personCurp',
      'personRfc',
      'personImssNss',
    ];

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else if (typeof value === 'string') {
        sanitized[key] = this.sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
