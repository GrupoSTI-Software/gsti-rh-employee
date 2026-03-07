import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  IVerificationAttendanceLockPort,
  IVerificationAttendanceLockApiResponse,
} from '../domain/verification-attendance-lock.port';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';
import { ApiErrorTranslatorService } from '@core/services/api-error-translator.service';
@Injectable({
  providedIn: 'root',
})
export class HttpVerificationAttendanceLockAdapter implements IVerificationAttendanceLockPort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiErrorTranslator = inject(ApiErrorTranslatorService);
  private readonly apiUrl = environment.API_URL;

  /**
   * Verifica el bloqueo de asistencia por faltas o retardos desde la API
   * @param type - Tipo de verificación: 'absences' o 'tardiness'
   * @returns Promise con la respuesta de la verificación de bloqueo de asistencia
   */
  async verifyAttendanceLock(type: string): Promise<IVerificationAttendanceLockApiResponse | null> {
    try {
      const response = await firstValueFrom<IVerificationAttendanceLockApiResponse>(
        this.http.get<IVerificationAttendanceLockApiResponse>(
          `${this.apiUrl}/v1/assists/verify-attendance-lock/${type}`,
        ),
      );
      return response;
    } catch (error: unknown) {
      this.logger.error('Error al verificar el bloqueo de asistencia:', error);

      // Traducir el mensaje de error si es posible
      if (error instanceof HttpErrorResponse) {
        const errorBody = error.error as { message?: string } | null;
        if (errorBody?.message !== undefined) {
          this.logger.error(
            'Mensaje del API:',
            this.apiErrorTranslator.translateError(errorBody.message),
          );
        }
      }

      return null;
    }
  }
}
