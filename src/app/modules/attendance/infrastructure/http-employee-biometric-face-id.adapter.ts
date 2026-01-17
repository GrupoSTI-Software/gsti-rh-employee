import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';
import { SecureStorageService } from '@core/services/secure-storage.service';
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
  private readonly secureStorage = inject(SecureStorageService);
  private readonly apiUrl = environment.API_URL;

  // Clave para almacenar el token de la foto del empleado
  private readonly EMPLOYEE_BIOMETRIC_FACE_ID_TOKEN_KEY = 'employee_biometric_face_id_token';

  /**
   * Genera un token único para la foto del empleado
   * @returns Token único en formato UUID v4
   */
  private generatePhotoToken(): string {
    // Generar un UUID v4 simple
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Obtiene el token de la foto del empleado si existe
   * @returns Token de la foto o null si no existe
   */
  private getPhotoToken(): string | null {
    return this.secureStorage.getItem(this.EMPLOYEE_BIOMETRIC_FACE_ID_TOKEN_KEY);
  }

  /**
   * Crea y guarda un token de forma segura en localStorage
   * Si ya existe un token, no crea uno nuevo
   * @returns Token existente o nuevo token creado
   */
  private createAndSavePhotoToken(): string {
    // Verificar si ya existe un token
    const existingToken = this.getPhotoToken();
    if (existingToken) {
      this.logger.info('Token de foto ya existe, reutilizando token existente');
      return existingToken;
    }

    // Generar un nuevo token único
    const newToken = this.generatePhotoToken();

    // Guardar el token de forma segura en localStorage
    this.secureStorage.setItem(this.EMPLOYEE_BIOMETRIC_FACE_ID_TOKEN_KEY, newToken);

    this.logger.info('Nuevo token de foto creado y guardado');
    return newToken;
  }

  /**
   * Obtiene la fotografía del rostro del empleado, mandando un token generado en el frontend,
   * que se guarda en el localStorage de forma segura.
   * Si ya existe un token, no se crea uno nuevo.
   * @param employeeId - ID del empleado
   * @returns Promesa con la fotografía del empleado o null si hay error
   */
  async getEmployeeBiometricFaceId(employeeId: number): Promise<IEmployeeBiometricFaceId | null> {
    try {
      // Crear o obtener el token (solo crea uno nuevo si no existe)
      const token = this.createAndSavePhotoToken();
      console.log('token', token);
      const response = await firstValueFrom<IEmployeeBiometricFaceIdApiResponse>(
        this.http.get<IEmployeeBiometricFaceIdApiResponse>(
          `${this.apiUrl}/employees/${employeeId}/biometric-face-id-with-token/${token}`,
        ),
      );
      console.log('sameToken', response.data?.sameToken);
      return response.data?.employeeBiometricFaceId ?? null;
    } catch (error: unknown) {
      this.logger.error('Error al obtener la fotografía del rostro del empleado:', error);
      return null;
    }
  }
}
