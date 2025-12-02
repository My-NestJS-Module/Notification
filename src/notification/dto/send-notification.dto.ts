export interface SendNotificationDtoSubscriber {
  subscriberId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  locale?: string;
  timezone?: string;
  /**
   * Custom data cho subscriber, ví dụ tenantId, isPremium, v.v.
   */
  data?: Record<string, any>;
}

export interface SendNotificationEmailOverrides {
  from?: string;
  replyTo?: string;
  bcc?: string[];
  cc?: string[];
  subject?: string;
}

export interface SendNotificationSmsOverrides {
  /**
   * Số gửi đi (sender) – định dạng phụ thuộc provider (Twilio, SNS, ...)
   */
  from?: string;
}

export interface SendNotificationPushOverrides {
  title?: string;
  sound?: string;
  badge?: number;
}

export interface SendNotificationInAppOverrides {
  title?: string;
  body?: string;
}

export interface SendNotificationOverrides {
  email?: SendNotificationEmailOverrides;
  sms?: SendNotificationSmsOverrides;
  push?: SendNotificationPushOverrides;
  inApp?: SendNotificationInAppOverrides;
}

export interface SendNotificationDto {
  /**
   * Thông tin subscriber – bắt buộc phải có subscriberId.
   */
  to: SendNotificationDtoSubscriber;

  /**
   * ID workflow trong Novu.
   */
  workflowId: string;

  /**
   * Payload dữ liệu cho template.
   */
  payload: Record<string, any>;

  /**
   * Overrides theo kênh (email/sms/push/in_app) – optional.
   */
  overrides?: SendNotificationOverrides;

  /**
   * ID transaction để tracking / idempotency.
   */
  transactionId?: string;
}


