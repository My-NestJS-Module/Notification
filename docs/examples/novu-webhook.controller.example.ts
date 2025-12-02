/**
 * MẪU CONTROLLER XỬ LÝ WEBHOOK NOVU
 *
 * File này là ví dụ mẫu cho project host. Project host cần:
 * 1. Copy file này vào project của họ
 * 2. Tùy chỉnh theo nhu cầu (guard, middleware, routing, v.v.)
 * 3. Implement NotificationStatusService (xem notification-status.service.example.ts)
 *
 * LƯU Ý: Module core KHÔNG tự tạo controller này để tránh coupling với routing/security của từng dự án.
 */

import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { NovuWebhookEvent } from '../../src/notification/interfaces';
import { NotificationStatusService } from './notification-status.service.example';

/**
 * Guard để verify webhook signature (nếu cấu hình trong Novu Dashboard).
 * Project host cần implement guard này dựa trên secret key.
 */
// @UseGuards(NovuWebhookGuard) // Uncomment khi đã implement guard

@Controller('internal/webhooks')
export class NovuWebhookController {
  private readonly logger = new Logger(NovuWebhookController.name);

  constructor(
    private readonly notificationStatusService: NotificationStatusService,
  ) {}

  /**
   * Endpoint nhận webhook từ Novu.
   * URL gợi ý: POST /internal/webhooks/novu
   *
   * Novu có thể gửi:
   * - Single event: { id, type, timestamp, ... }
   * - Array of events: [{ id, ... }, { id, ... }]
   *
   * @param body - Payload từ Novu (single event hoặc array)
   * @param signature - Header x-novu-signature (nếu cấu hình secret)
   */
  @Post('novu')
  @HttpCode(200)
  async handleNovuWebhook(
    @Body() body: NovuWebhookEvent | NovuWebhookEvent[],
    @Headers('x-novu-signature') signature?: string,
  ) {
    this.logger.log('Received webhook from Novu');

    // TODO: Verify signature nếu bạn cấu hình Secret trong Novu Dashboard
    // this.verifySignature(signature, body);

    // Normalize: Novu có thể gửi single event hoặc array
    const events = Array.isArray(body) ? body : [body];

    // Xử lý từng event (có thể parallel nếu cần)
    const results = await Promise.allSettled(
      events.map((event) => this.notificationStatusService.handle(event)),
    );

    // Log kết quả
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    if (failed > 0) {
      this.logger.warn(
        `Processed ${succeeded} events, ${failed} failed`,
        results
          .filter((r) => r.status === 'rejected')
          .map((r) => (r as PromiseRejectedResult).reason),
      );
    } else {
      this.logger.log(`Successfully processed ${succeeded} events`);
    }

    // Novu chỉ cần 200 OK, không cần trả data
    return { received: events.length, processed: succeeded };
  }

  /**
   * Verify webhook signature (nếu cấu hình secret trong Novu Dashboard).
   * 
   * Novu sử dụng Svix để ký webhook. Bạn có thể dùng thư viện @svix/node:
   * 
   * ```typescript
   * import { Webhook } from '@svix/node';
   * 
   * private verifySignature(
   *   signature: string | undefined,
   *   body: any,
   * ): void {
   *   if (!signature) {
   *     throw new Error('Missing webhook signature');
   *   }
   * 
   *   const secret = process.env.NOVU_WEBHOOK_SECRET;
   *   if (!secret) {
   *     throw new Error('NOVU_WEBHOOK_SECRET is not configured');
   *   }
   * 
   *   const webhook = new Webhook(secret);
   *   const payload = JSON.stringify(body);
   *   const headers = {
   *     'svix-id': headers['svix-id'],
   *     'svix-timestamp': headers['svix-timestamp'],
   *     'svix-signature': signature,
   *   };
   * 
   *   try {
   *     webhook.verify(payload, headers);
   *   } catch (err) {
   *     throw new Error(`Invalid webhook signature: ${err.message}`);
   *   }
   * }
   * ```
   */
  // private verifySignature(signature: string | undefined, body: any): void {
  //   // Implement signature verification
  // }
}

