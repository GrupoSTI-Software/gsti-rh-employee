import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  IVerificationAttendanceLockPort,
  IVerificationAttendanceLockApiResponse,
} from '../domain/verification-attendance-lock.port';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';
@Injectable({
  providedIn: 'root',
})
export class HttpVerificationAttendanceLockAdapter implements IVerificationAttendanceLockPort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiUrl = environment.API_URL;

  /**
   * Verifica el bloqueo de asistencia por faltas o retardos desde la API
   * @returns Promise con la respuesta de la verificación de bloqueo de asistencia
   */
  async verifyAttendanceLock(): Promise<IVerificationAttendanceLockApiResponse | null> {
    try {
      const response = await firstValueFrom<IVerificationAttendanceLockApiResponse>(
        this.http.get<IVerificationAttendanceLockApiResponse>(
          `${this.apiUrl}/v1/assists/verify-attendance-lock`,
        ),
      );
      return response;
    } catch (error: unknown) {
      this.logger.error('Error al verificar el bloqueo de asistencia:', error);
      return null;
    }
  }
}
