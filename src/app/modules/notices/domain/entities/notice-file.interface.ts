export interface INoticeFileInterface {
  noticeFileId: number | null;
  noticeId: number | null;
  noticeFilePath: string | null;
  noticeFileCreatedAt?: string;
  noticeFileUpdatedAt?: string;
  deletedAt?: string | null;
}
