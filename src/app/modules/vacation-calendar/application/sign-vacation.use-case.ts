import { inject, Injectable } from '@angular/core';
import { VACATION_PORT } from '../domain/vacation.token';
import { IVacationPort } from '../domain/entities/vacation-port.interface';
import { LoggerService } from '@core/services/logger.service';

/**
 * Caso de uso para firmar vacaciones
 */
@Injectable({
  providedIn: 'root',
})
export class SignVacationUseCase {
  private readonly vacationPort = inject<IVacationPort>(VACATION_PORT);
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para firmar vacaciones
   * @param signature - Blob de la imagen de la firma
   * @param vacationSettingId - ID de la configuración de vacaciones
   * @param shiftExceptionIds - Array de IDs de excepciones de turno a firmar
   * @returns Promise que se resuelve cuando la firma se envía correctamente
   */
  async execute(
    signature: Blob,
    vacationSettingId: number,
    shiftExceptionIds: number[],
  ): Promise<boolean> {
    try {
      return await this.vacationPort.signShiftExceptions(
        signature,
        vacationSettingId,
        shiftExceptionIds,
      );
    } catch (error) {
      this.logger.error('Error al firmar vacaciones:', error);
      return false;
    }
  }
}
