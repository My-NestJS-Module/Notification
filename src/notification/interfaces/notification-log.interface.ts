/**
 * Interface cho NotificationLog entity/model.
 * Project host có thể implement entity này theo ORM của họ (TypeORM, Prisma, Mongoose, v.v.).
 */
export interface NotificationLog {
  /**
   * Primary key (tự động generate).
   */
  id?: string | number;

  /**
   * ID event từ Novu (externalId).
   * Nên có unique constraint để đảm bảo idempotency.
   */
  externalId: string;

  /**
   * Workflow ID liên quan.
   */
  workflowId?: string | null;

  /**
   * Step ID trong workflow.
   */
  stepId?: string | null;

  /**
   * Kênh gửi (email, sms, push, in_app, chat).
   */
  channel?: string | null;

  /**
   * Trạng thái chuẩn hóa (DELIVERED, BOUNCED, OPENED, CLICKED, SENT, FAILED, ...).
   */
  status?: string | null;

  /**
   * Subscriber ID.
   */
  subscriberId?: string | null;

  /**
   * Provider ID (sendgrid, mailgun, twilio, fcm, ...).
   */
  providerId?: string | null;

  /**
   * Message ID từ provider (nếu có).
   */
  messageId?: string | null;

  /**
   * Thời điểm event xảy ra (từ event.timestamp).
   */
  occurredAt: Date | string;

  /**
   * Metadata và raw data từ provider.
   * Lưu dạng JSON/JSONB.
   */
  metadata?: Record<string, any> | null;

  /**
   * Raw payload từ Novu webhook (tùy chọn, để debug).
   */
  raw?: Record<string, any> | null;

  /**
   * Timestamps tự động.
   */
  createdAt?: Date | string;
  updatedAt?: Date | string;

  /**
   * Các trường tùy chỉnh cho multi-tenant hoặc business logic.
   */
  tenantId?: string | null;
  transactionId?: string | null;
  correlationId?: string | null;
}

/**
 * DTO để tạo notification log mới.
 */
export interface CreateNotificationLogDto {
  externalId: string;
  workflowId?: string | null;
  stepId?: string | null;
  channel?: string | null;
  status?: string | null;
  subscriberId?: string | null;
  providerId?: string | null;
  messageId?: string | null;
  occurredAt: Date | string;
  metadata?: Record<string, any> | null;
  raw?: Record<string, any> | null;
  tenantId?: string | null;
  transactionId?: string | null;
  correlationId?: string | null;
}

