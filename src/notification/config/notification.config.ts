import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface NotificationModuleOptions {
  novu: {
    apiKey: string;
    serverUrl?: string;
    appId?: string;
  };
}

@Injectable()
export class NotificationConfig {
  constructor(private readonly configService: ConfigService) { }

  /**
   * API key bắt buộc cho Novu. Fail-fast nếu thiếu để tránh chạy với cấu hình sai.
   */
  get apiKey(): string {
    const value = this.configService.get<string>('NOVU_API_KEY');

    if (!value) {
      throw new Error(
        '[NotificationModule] Missing NOVU_API_KEY. Please set it in environment variables.',
      );
    }

    return value;
  }

  /**
   * URL server Novu (mặc định https://api.novu.co nếu không cấu hình).
   */
  get serverUrl(): string | undefined {
    return this.configService.get<string>('NOVU_SERVER_URL') ?? undefined;
  }

  /**
   * App ID dùng cho Inbox (In-App) nếu cần.
   */
  get appId(): string | undefined {
    return this.configService.get<string>('NOVU_APP_ID') ?? undefined;
  }
}


