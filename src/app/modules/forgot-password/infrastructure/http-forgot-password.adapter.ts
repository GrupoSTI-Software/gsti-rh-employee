import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IForgotPasswordPort, IForgotPasswordResult } from '../domain/forgot-password.port';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';

/**
 * Interfaces para las respuestas de la API (específicas de esta implementación)
 */
interface IForgotPasswordUserData {
  userId?: number;
  userEmail?: string;
}
interface IForgotPasswordResponse {
  type: string;
  title: string;
  message: string;
  data: {
    user: IForgotPasswordUserData;
    code: string;
  };
}

/**
 * Adaptador HTTP para recuperación de contraseña
 * Implementa el puerto ForgotPasswordPort usando HTTP
 */
@Injectable({
  providedIn: 'root',
})
export class HttpForgotPasswordAdapter implements IForgotPasswordPort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiUrl = environment.API_URL;

  async forgotPassword(email: string): Promise<IForgotPasswordResult> {
    try {
      const payload: {
        userEmail: string;
        isApp: boolean;
      } = {
        userEmail: email,
        isApp: true,
      };

      const forgotPasswordResponse = await firstValueFrom(
        this.http.post<IForgotPasswordResponse>(`${this.apiUrl}/auth/recovery`, payload),
      );

      // Verificar que la respuesta sea exitosa
      if (
        forgotPasswordResponse?.type === 'success' &&
        forgotPasswordResponse?.data?.user !== undefined
      ) {
        return {
          success: true,
        };
      }

      // Si la respuesta no es exitosa, devolver error
      return {
        success: false,
        error: forgotPasswordResponse?.message ?? 'Error al recuperar contraseña',
      };
    } catch (error: unknown) {
      this.logger.error('Error al recuperar contraseña');

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
        error: 'Error al recuperar contraseña. Intenta nuevamente.',
      };
    }
  }
}
