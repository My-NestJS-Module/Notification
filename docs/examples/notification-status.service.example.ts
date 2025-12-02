/**
 * MẪU SERVICE XỬ LÝ TRẠNG THÁI NOTIFICATION
 *
 * File này là ví dụ mẫu cho project host. Project host cần:
 * 1. Copy file này vào project của họ
 * 2. Implement NotificationStatusIRepository với ORM của họ (TypeORM, Prisma, Mongoose, v.v.)
 * 3. Tùy chỉnh logic phát domain events (nếu cần)
 *
 * Service này chịu trách nhiệm:
 * - Map NovuWebhookEvent → NotificationLog entity
 * - Lưu vào database (với idempotency)
 * - (Optional) Phát domain events cho các bounded context khác
 */

import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { NovuWebhookEvent } from '../../src/notification/interfaces';
import {
  NotificationStatusIRepository,
  CreateNotificationLogDto,
} from '../../src/notification/interfaces';

/**
 * Domain events (tuỳ chọn) - project host tự định nghĩa.
 */
// export class NotificationDeliveredEvent {
//   constructor(
//     public readonly subscriberId: string,
//     public readonly workflowId: string,
//     public readonly channel: string,
//   ) {}
// }

// export class NotificationBouncedEvent {
//   constructor(
//     public readonly subscriberId: string,
//     public readonly workflowId: string,
//     public readonly channel: string,
//     public readonly reason?: string,
//   ) {}
// }

@Injectable()
export class NotificationStatusService {
  private readonly logger = new Logger(NotificationStatusService.name);

  constructor(
    /**
     * Inject repository. Project host cần provide implementation của NotificationStatusIRepository.
     *
     * Ví dụ với TypeORM:
     * ```typescript
     * @InjectRepository(NotificationLogEntity)
     * private readonly notificationLogRepository: Repository<NotificationLogEntity>,
     * ```
     *
     * Hoặc với custom repository:
     * ```typescript
     * @Inject('NOTIFICATION_STATUS_REPOSITORY')
     * private readonly repository: NotificationStatusIRepository,
     * ```
     */
    @Inject('NOTIFICATION_STATUS_REPOSITORY')
    @Optional()
    private readonly repository?: NotificationStatusIRepository,
  ) {}

  /**
   * Xử lý webhook event từ Novu.
   *
   * @param event - Event từ Novu
   */
  async handle(event: NovuWebhookEvent): Promise<void> {
    this.logger.debug(`Handling webhook event: ${event.id} (${event.type})`);

    try {
      // 1. Map event → DTO để lưu DB
      const logDto = this.mapEventToLogDto(event);

      // 2. Check idempotency (nếu repository hỗ trợ)
      if (this.repository) {
        const existing = await this.repository.findByExternalId(event.id);
        if (existing) {
          this.logger.debug(`Event ${event.id} already processed, skipping`);
          return;
        }

        // 3. Lưu vào DB
        await this.repository.save(logDto);
        this.logger.debug(`Saved notification log: ${event.id}`);
      } else {
        this.logger.warn(
          'NotificationStatusIRepository not provided, skipping database save',
        );
      }

      // 4. (Optional) Phát domain events
      // this.publishDomainEvents(event);
    } catch (error) {
      this.logger.error(
        `Failed to handle webhook event ${event.id}:`,
        error instanceof Error ? error.stack : error,
      );
      throw error; // Re-throw để controller có thể log và trả lỗi cho Novu
    }
  }

  /**
   * Map NovuWebhookEvent → CreateNotificationLogDto.
   */
  private mapEventToLogDto(event: NovuWebhookEvent): CreateNotificationLogDto {
    return {
      externalId: event.id,
      workflowId: event.workflowId ?? null,
      stepId: event.stepId ?? null,
      channel: event.channel ?? null,
      status: event.status ?? event.type ?? null,
      subscriberId: event.subscriberId ?? null,
      providerId: event.provider?.id ?? null,
      messageId: event.messageId ?? null,
      occurredAt: event.timestamp
        ? new Date(event.timestamp)
        : new Date(),
      metadata: {
        ...event.metadata,
        type: event.type,
        providerRaw: event.provider?.raw,
      },
      raw: event as any, // Lưu toàn bộ event để debug
      // Các trường tùy chỉnh từ metadata
      tenantId: event.metadata?.tenantId ?? null,
      transactionId: event.metadata?.transactionId ?? null,
      correlationId: event.metadata?.correlationId ?? null,
    };
  }

  /**
   * Phát domain events (tuỳ chọn).
   * Project host có thể implement với EventBus (NestJS CQRS) hoặc message broker.
   */
  // private publishDomainEvents(event: NovuWebhookEvent): void {
  //   if (!this.eventBus) {
  //     return;
  //   }

  //   switch (event.status) {
  //     case 'DELIVERED':
  //       this.eventBus.publish(
  //         new NotificationDeliveredEvent(
  //           event.subscriberId!,
  //           event.workflowId!,
  //           event.channel!,
  //         ),
  //       );
  //       break;

  //     case 'BOUNCED':
  //       this.eventBus.publish(
  //         new NotificationBouncedEvent(
  //           event.subscriberId!,
  //           event.workflowId!,
  //           event.channel!,
  //           event.provider?.raw?.reason,
  //         ),
  //       );
  //       break;

  //     // Thêm các case khác nếu cần
  //   }
  // }
}

