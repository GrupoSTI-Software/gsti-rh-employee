import { INoticeFileInterface } from './notice-file.interface';
import { INoticeRecipient } from './notice-recipient.interface';

/**
 * Modelo de aviso
 */
export interface INotice {
  noticeId: number;
  noticeSubject: string;
  noticeDescription: string;
  noticeRecipientEmails: string | null;
  noticeSentCount: number;
  noticeSentAt: string | null;
  noticeCreatedAt: string;
  noticeUpdatedAt: string;
  deletedAt: string | null;
  recipients?: INoticeRecipient[];
  files?: INoticeFileInterface[];
}
