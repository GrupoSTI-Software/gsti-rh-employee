import { inject, Injectable } from '@angular/core';
import { NOTICES_PORT } from '../domain/notices.token';
import { INoticePort } from '../domain/notices.port';
import { LoggerService } from '@core/services/logger.service';

/**
 * Caso de uso para marcar un aviso como leído
 */
@Injectable({
  providedIn: 'root',
})
export class MarkNoticeAsReadUseCase {
  private readonly noticesPort = inject<INoticePort>(NOTICES_PORT);
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para marcar un aviso como leído
   */
  async execute(noticeId: number, employeeId: number): Promise<boolean> {
    try {
      return await this.noticesPort.markAsRead(noticeId, employeeId);
    } catch (error) {
      this.logger.error('Error al marcar el aviso como leído:', error);
      return false;
    }
  }
}
