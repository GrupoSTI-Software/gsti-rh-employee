import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IResetPasswordPort, IResetPasswordResult } from '../domain/reset-password.port';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';

/**
 * Interfaces para las respuestas de la API (específicas de esta implementación)
 */
interface IResetPasswordUserData {
  userId?: number;
  userEmail?: string;
}

interface IResetPasswordResponse {
  type: string;
  title: string;
  message: string;
  data: {
    user: IResetPasswordUserData;
  };
}

/**
 * Adaptador HTTP para cambio de contraseña
 * Implementa el puerto ResetPasswordPort usando HTTP
 */
@Injectable({
  providedIn: 'root',
})
export class HttpResetPasswordAdapter implements IResetPasswordPort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiUrl = environment.API_URL;

  async resetPassword(token: string, password: string): Promise<IResetPasswordResult> {
    try {
      const payload: {
        token: string;
        password: string;
      } = {
        token: token,
        password: password,
      };

      const resetPasswordResponse = await firstValueFrom(
        this.http.post<IResetPasswordResponse>(`${this.apiUrl}/auth/password/reset`, payload),
      );

      // Verificar que la respuesta sea exitosa
      if (
        resetPasswordResponse?.type === 'success' &&
        resetPasswordResponse?.data?.user !== undefined
      ) {
        return {
          success: true,
        };
      }

      // Si la respuesta no es exitosa, devolver error
      return {
        success: false,
        error: resetPasswordResponse?.message ?? 'Error al cambiar contraseña',
      };
    } catch (error: unknown) {
      this.logger.error('Error al cambiar contraseña');

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
        error: 'Error al cambiar contraseña. Intenta nuevamente.',
      };
    }
  }
}
