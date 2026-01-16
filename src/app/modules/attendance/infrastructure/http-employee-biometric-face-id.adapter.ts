import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';
import { IEmployeeBiometricFaceIdPort } from '../domain/employee-biometric-face-id.port';
import { IEmployeeBiometricFaceIdApiResponse } from '../domain/entities/employee-biometric-face-id-response.interface';
import { IEmployeeBiometricFaceId } from '../domain/entities/employee-biometric-face-id.interface';

/**
 * Adaptador HTTP para trato fotográfia del empleado
 * Implementa el puerto AttendancePort usando HTTP
 * Nota: El token de autenticación se agrega automáticamente mediante el interceptor
 */
@Injectable({
  providedIn: 'root',
})
export class HttpEmployeeBiometricFaceIdAdapter implements IEmployeeBiometricFaceIdPort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiUrl = environment.API_URL;

  /**
   * Obtiene la fotografía del rostro del empleado
   */
  async getEmployeeBiometricFaceId(employeeId: number): Promise<IEmployeeBiometricFaceId | null> {
    try {
      const response = await firstValueFrom<IEmployeeBiometricFaceIdApiResponse>(
        this.http.get<IEmployeeBiometricFaceIdApiResponse>(
          `${this.apiUrl}/employees/${employeeId}/biometric-face-id`,
        ),
      );

      return response.data?.employeeBiometricFaceId ?? null;
    } catch (error: unknown) {
      this.logger.error('Error al obtener la fotografía del rostro del empleado:', error);
      return null;
    }
  }
}
