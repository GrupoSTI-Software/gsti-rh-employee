// Re-exportar interfaces directamente con sus nombres con prefijo I
export type { INoticePort, INoticesPaginatedResponse } from './entities/notice-port.interface';
export type { INotice } from './entities/notice.interface';
export type { INoticeRecipient } from './entities/notice-recipient.interface';
export type {
  INoticesApiResponse,
  INoticeApiResponse,
  IMarkAsReadApiResponse,
} from './entities/notice-api-response.interface';
