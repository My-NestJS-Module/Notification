## Tài liệu cho Project Host: Tích hợp Webhook Novu với NotificationModule

> File này dành cho **các dự án NestJS import module notification** từ library, không phải implementation nội bộ module.

### 1. Mục tiêu

- Nhận webhook trạng thái từ Novu (delivered/opened/bounced/...) vào backend của bạn.
- Ghi log vào DB (bảng `notification_logs` hoặc tương đương).
- (Tuỳ chọn) phát domain events (`NotificationDelivered`, `NotificationBounced`, ...) cho các bounded context khác.

Module core **không tự tạo controller** – bạn sẽ tự tạo controller & service trong project host, dựa trên DTO `NovuWebhookEvent` mà module cung cấp.

---

### 2. DTO và Domain Model

#### 2.1. DTO `NovuWebhookEvent` trong module core

Module core đã cung cấp interface tại `src/notification/interfaces/novu-webhook-event.interface.ts`:

```typescript
import { NovuWebhookEvent } from './notification/interfaces';
```

Interface này bao gồm:
  - `id`, `type`, `timestamp`
  - `workflowId`, `stepId`, `channel`, `status`
  - `subscriberId`, `messageId`
  - `provider: { id, raw? }`
  - `metadata?: Record<string, any>`

#### 2.2. NotificationLog Interface

Module core cung cấp interface cho entity `NotificationLog` tại `src/notification/interfaces/notification-log.interface.ts`:

```typescript
import { NotificationLog, CreateNotificationLogDto } from './notification/interfaces';
```

Interface này định nghĩa:
- Cấu trúc entity cho bảng `notification_logs`
- DTO `CreateNotificationLogDto` để tạo log mới
- Các trường: `externalId`, `workflowId`, `stepId`, `channel`, `status`, `subscriberId`, `providerId`, `messageId`, `occurredAt`, `metadata`, `raw`, v.v.

#### 2.3. NotificationStatusIRepository Interface

Module core cung cấp interface tối thiểu cho repository tại `src/notification/interfaces/notification-status-i-repository.interface.ts`:

```typescript
import { NotificationStatusIRepository } from './notification/interfaces';
```

Interface này định nghĩa các methods:
- `save(dto: CreateNotificationLogDto): Promise<NotificationLog>`
- `findByExternalId(externalId: string): Promise<NotificationLog | null>`
- `findBySubscriberId(subscriberId: string, limit?, offset?): Promise<NotificationLog[]>`
- `findByWorkflowId(workflowId: string, limit?, offset?): Promise<NotificationLog[]>`
- `findByStatus(status: string, limit?, offset?): Promise<NotificationLog[]>`

**Project host cần implement interface này với ORM của họ** (TypeORM, Prisma, Mongoose, v.v.).

#### 2.4. Schema Bảng `notification_logs` (Gợi ý)

Xem mẫu entity/migration trong `docs/examples/notification-log.entity.example.ts` cho:
- TypeORM Entity
- Prisma Schema
- Mongoose Schema
- SQL Migration (PostgreSQL)

Các trường chính:
- `id` (PK)
- `externalId` (string, unique) – map từ `event.id` (để đảm bảo idempotency)
- `workflowId`, `stepId`, `channel`, `status`
- `subscriberId`, `providerId`, `messageId`
- `occurredAt` (datetime)
- `metadata` (JSONB)
- `raw` (JSONB, optional)
- `createdAt`, `updatedAt`
- Indexes: `externalId` (unique), `subscriberId`, `workflowId`, `status`, `occurredAt`

Bạn có thể tùy chỉnh thêm các cột như `tenantId`, `transactionId`, `correlationId`.

---

### 3. Controller trong project host

**Module core không tự tạo controller** để tránh coupling với routing/security của từng dự án. Project host cần tự tạo controller dựa trên mẫu trong `docs/examples/novu-webhook.controller.example.ts`.

#### 3.1. Copy và Tùy Chỉnh Mẫu

1. Copy file `docs/examples/novu-webhook.controller.example.ts` vào project của bạn
2. Tùy chỉnh theo nhu cầu:
   - Path endpoint (mặc định: `POST /internal/webhooks/novu`)
   - Guard/middleware cho security
   - Logging/metering
   - Versioning nếu cần

#### 3.2. Ví Dụ Controller

```ts
// notifications-webhook.controller.ts (project host)
import { Body, Controller, Headers, HttpCode, Post, UseGuards } from '@nestjs/common';
import { NovuWebhookEvent } from '../notification/interfaces';
import { NotificationStatusService } from './notification-status.service';
// import { NovuWebhookGuard } from './guards/novu-webhook.guard'; // Nếu có guard

@Controller('internal/webhooks')
// @UseGuards(NovuWebhookGuard) // Uncomment khi đã implement guard
export class NovuWebhookController {
  constructor(
    private readonly notificationStatusService: NotificationStatusService,
  ) {}

  @Post('novu')
  @HttpCode(200)
  async handleNovuWebhook(
    @Body() body: NovuWebhookEvent | NovuWebhookEvent[],
    @Headers('x-novu-signature') signature?: string,
  ) {
    // TODO: verify signature nếu bạn cấu hình Secret trong Novu Dashboard
    // this.verifySignature(signature, body);

    const events = Array.isArray(body) ? body : [body];

    for (const event of events) {
      await this.notificationStatusService.handle(event);
    }
  }
}
```

**Lưu ý**:
- Path (`internal/webhooks/novu`) chỉ là gợi ý – bạn có thể đổi theo chuẩn route riêng của hệ thống
- Nhớ cập nhật URL trong Novu Dashboard nếu đổi path

---

### 4. Service xử lý trạng thái

**Module core không tự tạo service** để tránh coupling với database/ORM của từng dự án. Project host cần tự tạo service dựa trên mẫu trong `docs/examples/notification-status.service.example.ts`.

#### 4.1. Copy và Tùy Chỉnh Mẫu

1. Copy file `docs/examples/notification-status.service.example.ts` vào project của bạn
2. Implement `NotificationStatusIRepository` với ORM của bạn
3. Tùy chỉnh logic phát domain events (nếu cần)

#### 4.2. Implement Repository

Ví dụ với TypeORM:

```ts
// notification-log.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationLogEntity } from './notification-log.entity';
import {
  NotificationStatusIRepository,
  CreateNotificationLogDto,
  NotificationLog,
} from '../notification/interfaces';

@Injectable()
export class NotificationLogRepository implements NotificationStatusIRepository {
  constructor(
    @InjectRepository(NotificationLogEntity)
    private readonly repository: Repository<NotificationLogEntity>,
  ) {}

  async save(dto: CreateNotificationLogDto): Promise<NotificationLog> {
    const entity = this.repository.create(dto);
    return this.repository.save(entity);
  }

  async findByExternalId(externalId: string): Promise<NotificationLog | null> {
    return this.repository.findOne({ where: { externalId } });
  }

  // Implement các methods khác...
}
```

#### 4.3. Ví Dụ Service

```ts
// notification-status.service.ts (project host)
import { Injectable, Inject } from '@nestjs/common';
import { NovuWebhookEvent } from '../notification/interfaces';
import { NotificationStatusIRepository } from '../notification/interfaces';

@Injectable()
export class NotificationStatusService {
  constructor(
    @Inject('NOTIFICATION_STATUS_REPOSITORY')
    private readonly repository: NotificationStatusIRepository,
  ) {}

  async handle(event: NovuWebhookEvent): Promise<void> {
    // 1) Check idempotency
    const existing = await this.repository.findByExternalId(event.id);
    if (existing) {
      return; // Đã xử lý rồi
    }

    // 2) Map event → DTO
    const logDto = this.mapEventToLogDto(event);

    // 3) Lưu vào DB
    await this.repository.save(logDto);

    // 4) (Optional) phát domain events
    // if (event.status === 'DELIVERED') {
    //   this.eventBus.publish(new NotificationDeliveredEvent(...));
    // }
  }

  private mapEventToLogDto(event: NovuWebhookEvent) {
    return {
      externalId: event.id,
      workflowId: event.workflowId ?? null,
      stepId: event.stepId ?? null,
      channel: event.channel ?? null,
      status: event.status ?? event.type ?? null,
      subscriberId: event.subscriberId ?? null,
      providerId: event.provider?.id ?? null,
      messageId: event.messageId ?? null,
      occurredAt: new Date(event.timestamp),
      metadata: {
        ...event.metadata,
        type: event.type,
        providerRaw: event.provider?.raw,
      },
    };
  }
}
```

#### 4.4. Register Repository trong Module

```ts
// app.module.ts hoặc notification.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationLogEntity } from './notification-log.entity';
import { NotificationLogRepository } from './notification-log.repository';
import { NotificationStatusService } from './notification-status.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationLogEntity])],
  providers: [
    NotificationLogRepository,
    {
      provide: 'NOTIFICATION_STATUS_REPOSITORY',
      useClass: NotificationLogRepository,
    },
    NotificationStatusService,
  ],
})
export class NotificationModule {}
```

---

### 5. Best Practices

#### 5.1. Idempotency

- Sử dụng `event.id` (externalId) làm **idempotent key**.
- Khi lưu vào DB:
  - Đặt constraint unique trên `externalId`.
  - Trong service, check `findByExternalId()` trước khi save.
  - Nếu **INSERT conflict**, có thể:
    - Bỏ qua (đã xử lý trước đó) - khuyến nghị.
    - Hoặc cập nhật một số trường (nếu event cho cùng message nhưng status mới).

#### 5.2. Retry và Performance

- Novu có thể retry webhook khi backend lỗi (5xx).
- Bạn nên:
  - Trả `200 OK` càng sớm càng tốt sau khi queue/ghi log.
  - Tránh logic dài/blocking trong request thread.
  - Nếu hệ thống lớn, hãy đẩy vào queue nội bộ (Bull, RabbitMQ, v.v.) và xử lý async.
  - Sử dụng `Promise.allSettled()` để xử lý nhiều events song song.

#### 5.3. Bảo mật

- **Luôn cấu hình secret/signature** cho webhook trong Novu Dashboard nếu có thể.
- Novu sử dụng **Svix** để ký webhook. Bạn có thể verify với thư viện `@svix/node`:

```ts
import { Webhook } from '@svix/node';

const secret = process.env.NOVU_WEBHOOK_SECRET;
const webhook = new Webhook(secret);

// Trong controller hoặc guard
const payload = JSON.stringify(body);
const headers = {
  'svix-id': headers['svix-id'],
  'svix-timestamp': headers['svix-timestamp'],
  'svix-signature': signature,
};

try {
  webhook.verify(payload, headers);
} catch (err) {
  throw new Error(`Invalid webhook signature: ${err.message}`);
}
```

  - Optionally, kết hợp **IP allowlist** ở layer load balancer/API gateway.
- Sử dụng NestJS Guard để verify signature tự động:

```ts
// novu-webhook.guard.ts
@Injectable()
export class NovuWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-novu-signature'];
    // Verify signature...
    return true;
  }
}
```

---

### 6. Cấu hình trên Novu Dashboard

#### 6.1. Bật Outbound Webhook

1. Vào **Novu Dashboard** → **Project Settings** → **Webhooks** (hoặc **Activity** / **Integrations** tùy UI).
2. Bật **Outbound Webhook** / **Activity Tracking**.
3. Đặt URL backend:
   - Ví dụ: `https://your-api.com/internal/webhooks/novu`
   - Hoặc staging: `https://staging-api.com/internal/webhooks/novu`
4. (Khuyến nghị) Đặt **Secret** để ký payload:
   - Generate secret key (ví dụ: `whsec_...`)
   - Lưu vào env: `NOVU_WEBHOOK_SECRET`
   - Cấu hình trong Novu Dashboard
5. Chọn **Event Types** muốn nhận (nếu có filter):
   - `message.delivered`
   - `message.opened`
   - `message.clicked`
   - `message.bounced`
   - `message.failed`
   - v.v.

#### 6.2. Test Webhook

1. Test webhook từ Novu sang môi trường **staging/dev** trước khi bật production.
2. Sử dụng tool như **ngrok** để expose local endpoint khi test:
   ```bash
   ngrok http 3000
   # Dùng URL: https://xxx.ngrok.io/internal/webhooks/novu
   ```
3. Trigger một notification và kiểm tra webhook có được gửi không.
4. Verify signature và log trong backend.

#### 6.3. Environment Variables

Thêm vào `.env`:

```env
# Novu Webhook Secret (nếu cấu hình signature)
NOVU_WEBHOOK_SECRET=whsec_...
```

---

### 7. Use Case End-to-End

#### 7.1. Luồng Hoàn Chỉnh

```
1. Order Service gửi email
   ↓
2. NotificationService.sendNotification() → Novu
   ↓
3. Novu trigger workflow "order-confirmation"
   ↓
4. Novu gửi email qua provider (SendGrid/Twilio/...)
   ↓
5. Provider gửi event (delivered/opened/bounced) → Novu (inbound webhook)
   ↓
6. Novu normalize event → outbound webhook → Backend
   ↓
7. NovuWebhookController nhận event
   ↓
8. NotificationStatusService.handle() → lưu vào notification_logs
   ↓
9. (Optional) Phát domain events → Analytics/Dashboard
```

#### 7.2. Ví Dụ Code

```ts
// order.service.ts
async createOrder(orderData: CreateOrderDto) {
  const order = await this.orderRepository.save(orderData);

  // Gửi notification
  await this.notificationService.sendNotification({
    to: {
      subscriberId: order.userId,
      email: order.userEmail,
    },
    workflowId: 'order-confirmation',
    payload: {
      orderId: order.id,
      total: order.total,
    },
    transactionId: order.id, // Để track trong webhook
  });

  return order;
}

// Webhook sẽ nhận event với:
// - workflowId: 'order-confirmation'
// - subscriberId: order.userId
// - metadata.transactionId: order.id
// - status: 'DELIVERED' / 'OPENED' / 'BOUNCED'
```

### 8. Tóm Tắt Cho Team Tích Hợp

Module core cung cấp:

1. **Interfaces**:
   - `NovuWebhookEvent`: DTO cho webhook payload
   - `NotificationLog`: Interface cho entity
   - `NotificationStatusIRepository`: Interface cho repository

2. **Mẫu Code** (trong `docs/examples/`):
   - `novu-webhook.controller.example.ts`: Mẫu controller
   - `notification-status.service.example.ts`: Mẫu service
   - `notification-log.entity.example.ts`: Mẫu entity/migration

Project host cần:

1. Tạo bảng `notification_logs` trong DB (dựa trên mẫu entity).
2. Implement `NotificationStatusIRepository` với ORM của bạn.
3. Copy và tùy chỉnh controller + service từ mẫu.
4. Register repository và service trong module.
5. Cấu hình URL webhook trong Novu Dashboard.

**Lưu ý**: Mọi quyết định về:
- Đường dẫn URL
- Guard/middleware/security
- Cách log và phát domain events
- ORM và database schema

→ **Thuộc về project host**, không bị ép bởi module core.


