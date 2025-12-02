export interface ChannelPreference {
  enabled: boolean;
}

export interface SubscriberPreferences {
  /**
   * Theo schema Novu: channels.email/sms/in_app/push/chat.enabled
   */
  channels?: {
    email?: ChannelPreference;
    sms?: ChannelPreference;
    in_app?: ChannelPreference;
    push?: ChannelPreference;
    chat?: ChannelPreference;
    [key: string]: any;
  };

  /**
   * Lịch gửi (schedule) – giữ kiểu mở để không khoá cứng schema của Novu.
   * Xem ví dụ chi tiết trong docs Novu (weekly, time ranges, ...).
   */
  schedule?: Record<string, any>;

  /**
   * Các field mở rộng khác mà Novu có thể hỗ trợ trong tương lai.
   */
  [key: string]: any;
}


