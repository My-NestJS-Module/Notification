export interface NotificationErrorInfo {
  message: string;
  code?: string;
}

export type NotificationStatus = 'processed' | 'error';

export interface NotificationResult {
  /**
   * Novu đã acknowledge event hay chưa.
   */
  acknowledged: boolean;
  /**
   * Trạng thái xử lý cơ bản.
   */
  status: NotificationStatus;
  /**
   * Transaction ID từ Novu (nếu có).
   */
  transactionId?: string;
  /**
   * Thông tin lỗi nếu status = 'error'.
   */
  error?: NotificationErrorInfo;
}


