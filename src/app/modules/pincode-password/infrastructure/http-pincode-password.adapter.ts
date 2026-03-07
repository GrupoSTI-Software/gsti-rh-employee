import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IPincodePasswordPort, IPincodePasswordResult } from '../domain/pincode-password.port';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';
import { ApiErrorTranslatorService } from '@core/services/api-error-translator.service';

/**
 * Interfaces para las respuestas de la API (específicas de esta implementación)
 */
interface IPincodePasswordUserData {
  userId?: number;
  userEmail?: string;
}
interface IPincodePasswordResponse {
  type: string;
  title: string;
  message: string;
  data: {
    user: IPincodePasswordUserData;
    token: string;
  };
}

/**
 * Adaptador HTTP para verificación de código de verificación
 * Implementa el puerto PincodePasswordPort usando HTTP
 */
@Injectable({
  providedIn: 'root',
})
export class HttpPincodePasswordAdapter implements IPincodePasswordPort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiErrorTranslator = inject(ApiErrorTranslatorService);
  private readonly apiUrl = environment.API_URL;

  async verifyPincode(pinCode: string): Promise<IPincodePasswordResult> {
    try {
      const pincodePasswordResponse = await firstValueFrom(
        this.http.post<IPincodePasswordResponse>(
          `${this.apiUrl}/auth/request/code-verify/${pinCode}`,
          {},
        ),
      );

      // Verificar que la respuesta sea exitosa
      if (
        pincodePasswordResponse?.type === 'success' &&
        pincodePasswordResponse?.data?.user !== undefined
      ) {
        return {
          success: true,
          token: pincodePasswordResponse?.data?.token,
        };
      }

      // Si la respuesta no es exitosa, devolver error traducido
      const errorMessage =
        pincodePasswordResponse?.message ?? 'Error al verificar código de verificación';
      return {
        success: false,
        error: this.apiErrorTranslator.translateError(errorMessage),
      };
    } catch (error: unknown) {
      this.logger.error('Error al verificar código de verificación');

      // Si el error tiene una respuesta del servidor, intentar extraer el mensaje
      if (error instanceof HttpErrorResponse) {
        const errorBody = error.error as { message?: string } | null;
        if (errorBody?.message !== undefined) {
          return {
            success: false,
            error: this.apiErrorTranslator.translateError(errorBody.message),
          };
        }
      }

      if (error instanceof Error && error.message.length > 0) {
        return {
          success: false,
          error: this.apiErrorTranslator.translateError(error.message),
        };
      }

      return {
        success: false,
        error: this.apiErrorTranslator.translateError(
          'Error al verificar código de verificación. Intenta nuevamente.',
        ),
      };
    }
  }
}
