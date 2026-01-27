import { INotice } from './notice.interface';

/**
 * Puerto para gestión de avisos
 */
export interface INoticePort {
  /**
   * Obtiene la lista de avisos del empleado
   */
  getNotices(
    employeeId: number,
    page?: number,
    limit?: number,
    search?: string,
    readStatus?: 'all' | 'read' | 'unread',
  ): Promise<INoticesPaginatedResponse | null>;

  /**
   * Obtiene un aviso por su ID
   */
  getNoticeById(noticeId: number, employeeId: number): Promise<INotice | null>;

  /**
   * Marca un aviso como leído
   */
  markAsRead(noticeId: number, employeeId: number): Promise<boolean>;

  /**
   * Obtiene el conteo de avisos no leídos del empleado
   */
  getUnreadCount(employeeId: number): Promise<number>;
}

/**
 * Respuesta paginada de avisos
 */
export interface INoticesPaginatedResponse {
  meta: {
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    firstPage: number;
    firstPageUrl: string;
    lastPageUrl: string;
    nextPageUrl: string | null;
    previousPageUrl: string | null;
  };
  data: INotice[];
}
