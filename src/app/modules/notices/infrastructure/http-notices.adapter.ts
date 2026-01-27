import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  INoticePort,
  INotice,
  INoticesPaginatedResponse,
  INoticesApiResponse,
  INoticeApiResponse,
  IMarkAsReadApiResponse,
} from '../domain/notices.port';
import { environment } from '@env/environment';
import { LoggerService } from '@core/services/logger.service';

/**
 * Adaptador HTTP para avisos
 * Implementa el puerto NoticePort usando HTTP
 * Nota: El token de autenticación se agrega automáticamente mediante el interceptor
 */
@Injectable({
  providedIn: 'root',
})
export class HttpNoticesAdapter implements INoticePort {
  private readonly http = inject(HttpClient);
  private readonly logger = inject(LoggerService);
  private readonly apiUrl = environment.API_URL;

  /**
   * Obtiene la lista de avisos del empleado
   */
  async getNotices(
    employeeId: number,
    page: number = 1,
    limit: number = 10,
    search?: string,
    readStatus?: 'all' | 'read' | 'unread',
  ): Promise<INoticesPaginatedResponse | null> {
    try {
      let params = new HttpParams()
        .set('page', page.toString())
        .set('limit', limit.toString())
        .set('employeeId', employeeId.toString());

      if (search !== undefined && search !== null && search.trim() !== '') {
        params = params.set('search', search.trim());
      }

      if (readStatus && readStatus !== 'all') {
        params = params.set('readStatus', readStatus);
      }

      const response = await firstValueFrom<INoticesApiResponse>(
        this.http.get<INoticesApiResponse>(`${this.apiUrl}/notices`, { params }),
      );

      return response.data?.notices ?? null;
    } catch (error: unknown) {
      this.logger.error('Error al obtener avisos:', error);
      return null;
    }
  }

  /**
   * Obtiene un aviso por su ID
   */
  async getNoticeById(noticeId: number, employeeId: number): Promise<INotice | null> {
    try {
      const params = new HttpParams().set('employeeId', employeeId.toString());

      const response = await firstValueFrom<INoticeApiResponse>(
        this.http.get<INoticeApiResponse>(`${this.apiUrl}/notices/${noticeId}`, { params }),
      );

      return response.data?.notice ?? null;
    } catch (error: unknown) {
      this.logger.error('Error al obtener el aviso:', error);
      return null;
    }
  }

  /**
   * Marca un aviso como leído
   */
  async markAsRead(noticeId: number, employeeId: number): Promise<boolean> {
    try {
      const params = new HttpParams().set('employeeId', employeeId.toString());

      const response = await firstValueFrom<IMarkAsReadApiResponse>(
        this.http.post<IMarkAsReadApiResponse>(
          `${this.apiUrl}/notices/${noticeId}/mark-as-read`,
          {},
          { params },
        ),
      );

      return response.type === 'success';
    } catch (error: unknown) {
      this.logger.error('Error al marcar el aviso como leído:', error);
      return false;
    }
  }

  /**
   * Obtiene el conteo de avisos no leídos del empleado
   */
  async getUnreadCount(employeeId: number): Promise<number> {
    try {
      const params = new HttpParams().set('employeeId', employeeId.toString());

      interface IUnreadCountResponse {
        type: string;
        title: string;
        message: string;
        data: {
          unreadCount: number;
        };
      }

      const response = await firstValueFrom<IUnreadCountResponse>(
        this.http.get<IUnreadCountResponse>(`${this.apiUrl}/notices/unread-count`, { params }),
      );

      return response.data?.unreadCount ?? 0;
    } catch (error: unknown) {
      this.logger.error('Error al obtener el conteo de avisos no leídos:', error);
      return 0;
    }
  }
}
