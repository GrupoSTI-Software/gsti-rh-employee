import { inject, Injectable } from '@angular/core';
import { NOTICES_PORT } from '../domain/notices.token';
import { INoticePort, INotice } from '../domain/notices.port';
import { LoggerService } from '@core/services/logger.service';

/**
 * Caso de uso para obtener un aviso por su ID
 */
@Injectable({
  providedIn: 'root',
})
export class GetNoticeByIdUseCase {
  private readonly noticesPort = inject<INoticePort>(NOTICES_PORT);
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para obtener un aviso
   */
  async execute(noticeId: number, employeeId: number): Promise<INotice | null> {
    try {
      return await this.noticesPort.getNoticeById(noticeId, employeeId);
    } catch (error) {
      this.logger.error('Error al obtener el aviso:', error);
      return null;
    }
  }
}
