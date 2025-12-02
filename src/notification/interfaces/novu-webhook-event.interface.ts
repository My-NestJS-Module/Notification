/**
 * Sự kiện webhook mà Novu gửi ngược về backend.
 * Đây là DTO nội bộ đề xuất, không bắt buộc project host phải dùng 1:1,
 * nhưng giúp chuẩn hóa cách map dữ liệu vào domain (notification_logs, events,...).
 */
export interface NovuWebhookEventProviderInfo {
  /**
   * ID provider trong Novu (sendgrid, mailgun, twilio, fcm, ...).
   */
  id: string;
  /**
   * Payload raw từ provider (nếu Novu forward lại).
   */
  raw?: Record<string, any>;
}

export type NovuWebhookChannel =
  | 'email'
  | 'sms'
  | 'push'
  | 'in_app'
  | 'chat'
  | string;

export interface NovuWebhookEvent {
  /**
   * ID của event trong Novu.
   */
  id: string;

  /**
   * Loại event: message_delivered, message_bounced, message_opened, message_clicked, ...
   */
  type: string;

  /**
   * Thời điểm event xảy ra (ISO datetime).
   */
  timestamp: string;

  /**
   * Workflow liên quan (workflowId trong Novu).
   */
  workflowId?: string;

  /**
   * Step trong workflow (email/sms/push/in_app/...).
   */
  stepId?: string;

  /**
   * Kênh gửi (email, sms, push, in_app, chat, ...).
   */
  channel?: NovuWebhookChannel;

  /**
   * Trạng thái chuẩn hóa (DELIVERED/BOUNCED/OPENED/CLICKED/..., phụ thuộc cấu hình).
   */
  status?: string;

  /**
   * subscriberId đã được sử dụng ở lúc trigger.
   */
  subscriberId?: string;

  /**
   * ID message ở provider (nếu có).
   */
  messageId?: string;

  /**
   * Thông tin provider/source của event.
   */
  provider?: NovuWebhookEventProviderInfo;

  /**
   * Bất kỳ metadata nào bạn đính kèm (transactionId, correlationId, tenantId, ...).
   */
  metadata?: Record<string, any>;

  /**
   * Cho phép chứa thêm trường khác mà Novu có thể thêm trong tương lai.
   */
  [key: string]: any;
}


