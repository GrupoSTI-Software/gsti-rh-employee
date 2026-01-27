import { inject, Injectable } from '@angular/core';
import { NOTICES_PORT } from '../domain/notices.token';
import { INoticePort } from '../domain/notices.port';
import { LoggerService } from '@core/services/logger.service';

/**
 * Caso de uso para obtener el conteo de avisos no leídos
 */
@Injectable({
  providedIn: 'root',
})
export class GetUnreadCountUseCase {
  private readonly noticesPort = inject<INoticePort>(NOTICES_PORT);
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para obtener el conteo de avisos no leídos
   */
  async execute(employeeId: number): Promise<number> {
    try {
      return await this.noticesPort.getUnreadCount(employeeId);
    } catch (error) {
      this.logger.error('Error al obtener el conteo de avisos no leídos:', error);
      return 0;
    }
  }
}
