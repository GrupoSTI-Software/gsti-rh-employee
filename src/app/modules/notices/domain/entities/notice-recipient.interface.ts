/**
 * Información del destinatario del aviso
 */
export interface INoticeRecipient {
  noticeRecipientId: number;
  noticeId: number;
  employeeId: number | null;
  employeeEmail: string;
  employeeName: string | null;
  noticeRecipientSent: boolean;
  noticeRecipientSentAt: string | null;
  noticeRecipientRead: boolean | number;
  noticeRecipientReadAt: string | null;
  noticeRecipientError: string | null;
  noticeRecipientCreatedAt: string;
  noticeRecipientUpdatedAt: string;
  deletedAt: string | null;
}
