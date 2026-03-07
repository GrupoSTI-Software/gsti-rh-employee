import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorTranslatorService } from '@core/services/api-error-translator.service';

/**
 * Utilidades para manejar errores HTTP y traducirlos al idioma del usuario
 */

/**
 * Extrae y traduce el mensaje de error de una respuesta HTTP
 * @param error - Error HTTP o Error genérico
 * @param translator - Servicio de traducción de errores del API
 * @param defaultMessage - Mensaje por defecto si no se puede extraer el error
 * @returns Mensaje de error traducido
 */
export function translateHttpError(
  error: unknown,
  translator: ApiErrorTranslatorService,
  defaultMessage: string,
): string {
  // Si el error tiene una respuesta del servidor, intentar extraer el mensaje
  if (error instanceof HttpErrorResponse) {
    const errorBody = error.error as { message?: string } | null;
    if (errorBody?.message !== undefined) {
      return translator.translateError(errorBody.message);
    }
  }

  // Si es un Error genérico con mensaje
  if (error instanceof Error && error.message.length > 0) {
    return translator.translateError(error.message);
  }

  // Devolver mensaje por defecto traducido
  return translator.translateError(defaultMessage);
}

/**
 * Extrae el mensaje de error de una respuesta del API sin traducir
 * Útil para logging o debugging
 * @param error - Error HTTP o Error genérico
 * @param defaultMessage - Mensaje por defecto si no se puede extraer el error
 * @returns Mensaje de error original
 */
export function extractApiErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof HttpErrorResponse) {
    const errorBody = error.error as { message?: string } | null;
    if (errorBody?.message !== undefined) {
      return errorBody.message;
    }
  }

  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  return defaultMessage;
}
