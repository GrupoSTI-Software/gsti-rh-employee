import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { IVacationPort, IYearWorked, IYearsWorkedApiResponse } from '../domain/vacation.port';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';
import { ApiErrorTranslatorService } from '@core/services/api-error-translator.service';

/**
 * Adaptador HTTP para vacaciones
 * Implementa el puerto VacationPort usando HTTP
 * Nota: El token de autenticación se agrega automáticamente mediante el interceptor
 */
@Injectable({
  providedIn: 'root',
})
export class HttpVacationAdapter implements IVacationPort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiErrorTranslator = inject(ApiErrorTranslatorService);
  private readonly apiUrl = environment.API_URL;

  /**
   * Obtiene los años trabajados y vacaciones del empleado
   */
  async getYearsWorked(employeeId: number, year?: number): Promise<IYearWorked[]> {
    try {
      let url = `${this.apiUrl}/employees/${employeeId}/get-years-worked`;
      if (year) {
        url += ``;
      }

      const response = await firstValueFrom<IYearsWorkedApiResponse>(
        this.http.get<IYearsWorkedApiResponse>(url),
      );

      return response.data?.yearsWorked ?? [];
    } catch (error: unknown) {
      this.logger.error('Error al obtener años trabajados:', error);
      return [];
    }
  }

  /**
   * Firma las excepciones de turno (vacaciones)
   * @param signature - Blob de la imagen de la firma
   * @param vacationSettingId - ID de la configuración de vacaciones
   * @param shiftExceptionIds - Array de IDs de excepciones de turno a firmar
   * @returns Promise que se resuelve cuando la firma se envía correctamente
   */
  async signShiftExceptions(
    signature: Blob,
    vacationSettingId: number,
    shiftExceptionIds: number[],
  ): Promise<boolean> {
    try {
      const url = `${this.apiUrl}/vacation-authorizations/sign-shift-exceptions`;

      const formData = new FormData();
      formData.append('signature', signature, 'signature.png');
      formData.append('vacationSettingId', vacationSettingId.toString());

      shiftExceptionIds.forEach((id) => {
        formData.append('shiftExceptionIds[]', id.toString());
      });

      await firstValueFrom(this.http.post(url, formData));

      return true;
    } catch (error: unknown) {
      this.logger.error('Error al firmar excepciones de turno:', error);

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

      return false;
    }
  }
}
