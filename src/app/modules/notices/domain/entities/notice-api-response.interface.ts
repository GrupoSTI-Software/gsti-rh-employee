import { INotice } from './notice.interface';
import { INoticesPaginatedResponse } from './notice-port.interface';

/**
 * Respuesta de la API para obtener avisos paginados
 */
export interface INoticesApiResponse {
  type: string;
  title: string;
  message: string;
  data: {
    notices: INoticesPaginatedResponse;
  };
}

/**
 * Respuesta de la API para obtener un aviso
 */
export interface INoticeApiResponse {
  type: string;
  title: string;
  message: string;
  data: {
    notice: INotice;
  };
}

/**
 * Respuesta de la API para marcar como leído
 */
export interface IMarkAsReadApiResponse {
  type: string;
  title: string;
  message: string;
  data: {
    noticeRecipient: {
      noticeRecipientId: number;
      noticeRecipientRead: boolean;
      noticeRecipientReadAt: string | null;
    };
  };
}
