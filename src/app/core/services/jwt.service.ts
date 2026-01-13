import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Payload decodificado del JWT
 */
export interface IJwtPayload {
  exp?: number;
  iat?: number;
  sub?: string;
  userId?: number;
  userEmail?: string;
  [key: string]: unknown;
}

/**
 * Prefijo para tokens OAuth personalizados del backend
 */
const OAUTH_TOKEN_PREFIX = 'oauth__';

/**
 * Servicio para manejo de tokens JWT y OAuth personalizados
 * Proporciona validación de expiración y decodificación segura
 */
@Injectable({
  providedIn: 'root',
})
export class JwtService {
  private readonly platformId = inject(PLATFORM_ID);

  /**
   * Margen de seguridad en segundos antes de considerar el token expirado
   * Esto permite renovar el token antes de que expire realmente
   */
  private readonly EXPIRY_MARGIN_SECONDS = 60;

  /**
   * Verifica si un token es de tipo OAuth personalizado
   * @param token - Token a verificar
   * @returns true si es un token OAuth personalizado
   */
  isOAuthToken(token: string): boolean {
    return token?.startsWith(OAUTH_TOKEN_PREFIX) ?? false;
  }

  /**
   * Decodifica un token JWT sin verificar la firma
   * NOTA: Esto solo decodifica, no valida la firma del token
   */
  decode(token: string): IJwtPayload | null {
    if (!token) {
      return null;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      // Decodificar base64url a base64
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');

      // Decodificar base64
      let jsonPayload: string;

      if (isPlatformBrowser(this.platformId)) {
        jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join(''),
        );
      } else {
        // En SSR, usar Buffer
        const buffer = Buffer.from(base64, 'base64');
        jsonPayload = buffer.toString('utf-8');
      }

      return JSON.parse(jsonPayload) as IJwtPayload;
    } catch {
      return null;
    }
  }

  /**
   * Verifica si un token ha expirado
   * @param token - Token JWT o OAuth a verificar
   * @returns true si el token ha expirado o es inválido
   */
  isExpired(token: string): boolean {
    // Los tokens OAuth personalizados no contienen información de expiración
    // El backend maneja la expiración de estos tokens
    if (this.isOAuthToken(token)) {
      return false;
    }

    const payload = this.decode(token);

    if (!payload) {
      return true;
    }

    // Si no hay campo exp, asumir que no expira
    if (typeof payload.exp !== 'number') {
      return false;
    }

    // Obtener tiempo actual en segundos
    const currentTime = Math.floor(Date.now() / 1000);

    // Verificar si ha expirado (con margen de seguridad)
    return payload.exp < currentTime + this.EXPIRY_MARGIN_SECONDS;
  }

  /**
   * Obtiene el tiempo restante hasta la expiración en segundos
   * @param token - Token JWT o OAuth
   * @returns Segundos restantes, 86400 (24 horas) para tokens OAuth, o -1 si ya expiró o es inválido
   */
  getTimeUntilExpiry(token: string): number {
    // Los tokens OAuth personalizados no contienen información de expiración
    // Retornamos un valor por defecto de 24 horas para manejo de cookies
    if (this.isOAuthToken(token)) {
      return 86400;
    }

    const payload = this.decode(token);

    if (!payload || typeof payload.exp !== 'number') {
      return -1;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const remaining = payload.exp - currentTime;

    return remaining > 0 ? remaining : -1;
  }

  /**
   * Verifica si el token está próximo a expirar
   * @param token - Token JWT o OAuth
   * @param thresholdSeconds - Umbral en segundos (default: 5 minutos)
   * @returns true si el token expira pronto, false para tokens OAuth (manejo del backend)
   */
  isAboutToExpire(token: string, thresholdSeconds = 300): boolean {
    // Los tokens OAuth personalizados no contienen información de expiración
    // El backend maneja la renovación de estos tokens
    if (this.isOAuthToken(token)) {
      return false;
    }

    const timeRemaining = this.getTimeUntilExpiry(token);

    if (timeRemaining === -1) {
      return true;
    }

    return timeRemaining < thresholdSeconds;
  }

  /**
   * Obtiene el ID del usuario del token
   */
  getUserId(token: string): string | null {
    const payload = this.decode(token);

    if (!payload) {
      return null;
    }

    // Intentar obtener el ID de diferentes campos comunes
    if (payload.sub) {
      return payload.sub;
    }

    if (payload.userId) {
      return payload.userId.toString();
    }

    return null;
  }

  /**
   * Obtiene el email del usuario del token
   */
  getUserEmail(token: string): string | null {
    const payload = this.decode(token);

    if (!payload) {
      return null;
    }

    if (typeof payload.userEmail === 'string') {
      return payload.userEmail;
    }

    return null;
  }

  /**
   * Verifica si un string tiene formato de token válido (JWT o OAuth personalizado)
   * @param token - Token a validar
   * @returns true si el formato es válido
   */
  isValidFormat(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Verificar si es un token OAuth personalizado
    if (this.isOAuthToken(token)) {
      return this.isValidOAuthFormat(token);
    }

    // Verificar formato JWT estándar (3 partes separadas por puntos)
    return this.isValidJwtFormat(token);
  }

  /**
   * Verifica si un string tiene formato de token JWT estándar válido
   * @param token - Token JWT a validar
   * @returns true si es un JWT válido con 3 partes base64url
   */
  private isValidJwtFormat(token: string): boolean {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return false;
    }

    // Verificar que cada parte sea base64url válido
    const base64urlRegex = /^[A-Za-z0-9_-]+$/;

    return parts.every((part) => base64urlRegex.test(part));
  }

  /**
   * Verifica si un string tiene formato de token OAuth personalizado válido
   * Formato esperado: oauth__[provider]__[payload].[signature]
   * @param token - Token OAuth a validar
   * @returns true si el formato OAuth es válido
   */
  private isValidOAuthFormat(token: string): boolean {
    // El token debe tener al menos el prefijo y contenido
    if (token.length < 15) {
      return false;
    }

    // Verificar que después del prefijo haya contenido válido
    const tokenContent = token.substring(OAUTH_TOKEN_PREFIX.length);

    // El contenido debe tener al menos un underscore (para el provider) y caracteres
    if (!tokenContent.includes('__')) {
      return false;
    }

    // Obtener la parte después del segundo prefijo (provider)
    const providerEndIndex = tokenContent.indexOf('__');
    const payload = tokenContent.substring(providerEndIndex + 2);

    // Verificar que el payload tenga contenido y sea base64url válido con posibles puntos
    if (payload.length === 0) {
      return false;
    }

    // El payload puede contener puntos para separar partes
    const base64urlWithDotsRegex = /^[A-Za-z0-9_.-]+$/;

    return base64urlWithDotsRegex.test(payload);
  }
}
