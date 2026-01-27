import { inject, Injectable } from '@angular/core';
import { NOTICES_PORT } from '../domain/notices.token';
import { INoticePort, INoticesPaginatedResponse } from '../domain/notices.port';
import { LoggerService } from '@core/services/logger.service';

/**
 * Caso de uso para obtener la lista de avisos del empleado
 */
@Injectable({
  providedIn: 'root',
})
export class GetNoticesUseCase {
  private readonly noticesPort = inject<INoticePort>(NOTICES_PORT);
  private readonly logger = inject(LoggerService);

  /**
   * Ejecuta el caso de uso para obtener avisos
   */
  async execute(
    employeeId: number,
    page: number = 1,
    limit: number = 10,
    search?: string,
    readStatus?: 'all' | 'read' | 'unread',
  ): Promise<INoticesPaginatedResponse | null> {
    try {
      return await this.noticesPort.getNotices(employeeId, page, limit, search, readStatus);
    } catch (error) {
      this.logger.error('Error al obtener avisos:', error);
      return null;
    }
  }
}
