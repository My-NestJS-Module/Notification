---
title: Implement Guide — NestJS + Novu + Redis Notifications
---

> Tài liệu này tập trung vào **cách triển khai từng bước**, chia theo 4 cấp độ: **Junior, Middle, Senior, Principal**.  
> Kiến trúc tổng quan xem tại `ARCHITECTURE.md`.

## 1. Junior — Quick Setup & Hello World

### 1.1. Chuẩn bị môi trường

- **Yêu cầu**
  - Node.js + NestJS project chạy sẵn.
  - Tài khoản **Novu Cloud** hoặc self-host.
  - Redis instance (local Docker hoặc managed).

- **Environment variables (ví dụ)**

```bash
NOVU_API_KEY=your_novu_api_key
NOVU_API_URL=https://api.novu.co

REDIS_HOST=localhost
REDIS_PORT=6379
```

### 1.2. Cài đặt packages cơ bản

```bash
yarn add @novu/node bull ioredis
```

Hoặc:

```bash
npm install @novu/node bull ioredis
```

### 1.3. Tạo Novu client đơn giản

Trong `notification/providers/novu.provider.ts` (hoặc tương đương):

```ts
import { Injectable } from '@nestjs/common';
import { Novu } from '@novu/node';

@Injectable()
export class NovuProvider {
  private client: Novu;

  constructor() {
    this.client = new Novu(process.env.NOVU_API_KEY as string, {
      backendUrl: process.env.NOVU_API_URL,
    });
  }

  async triggerWorkflow(params: {
    workflowKey: string;
    to: { subscriberId: string; email?: string; phone?: string };
    payload?: Record<string, any>;
  }) {
    const { workflowKey, to, payload } = params;
    return this.client.trigger(workflowKey, {
      to,
      payload,
    });
  }
}
```

### 1.4. Gọi thử Novu từ service

Trong `notification.service.ts`, tạo method gửi thử một notification:

```ts
async sendTestNotification(subscriberId: string, email: string) {
  await this.novuProvider.triggerWorkflow({
    workflowKey: 'test-notification', // key đã tạo trên Novu
    to: { subscriberId, email },
    payload: {
      title: 'Xin chào từ hệ thống',
      body: 'Đây là thông báo test từ NestJS + Novu',
    },
  });
}
```

> Mục tiêu Junior: Hiểu được **luồng đơn giản** Backend → Novu → Email/In-app.

---

## 2. Middle — Thêm Redis Queue & Tách Luồng Gửi

### 2.1. Tạo Redis Queue cho Notification

Sử dụng `Bull` (hoặc `BullMQ`), ví dụ cơ bản:

```ts
// notification/notification.module.ts (ý tưởng)
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'notifications',
      redis: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
      },
    }),
  ],
  providers: [NotificationService, NovuProvider],
  exports: [NotificationService],
})
export class NotificationModule {}
```

### 2.2. Service: push job vào queue

```ts
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class NotificationService {
  constructor(
    @InjectQueue('notifications')
    private readonly notificationQueue: Queue,
    private readonly novuProvider: NovuProvider,
  ) {}

  async scheduleNotification(dto: {
    workflowKey: string;
    subscriberId: string;
    email?: string;
    phone?: string;
    payload?: Record<string, any>;
  }) {
    await this.notificationQueue.add('send-notification', dto, {
      attempts: 3,
      backoff: 5000,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }
}
```

### 2.3. Processor: Worker xử lý job & gọi Novu

```ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';

@Processor('notifications')
export class NotificationProcessor {
  constructor(private readonly novuProvider: NovuProvider) {}

  @Process('send-notification')
  async handleSendNotification(job: Job) {
    const { workflowKey, subscriberId, email, phone, payload } = job.data;

    await this.novuProvider.triggerWorkflow({
      workflowKey,
      to: { subscriberId, email, phone },
      payload,
    });
  }
}
```

> Mục tiêu Middle: Hiểu cách **tách luồng gửi** ra worker, sử dụng Redis queue để tăng độ ổn định & khả năng scale.

---

## 3. Senior — Hỗ trợ In-app, Email, SMS, Push/Mobile

### 3.1. Thiết kế DTO & Interface chuẩn hoá

- **DTO tạo notification**

```ts
export class SendNotificationDto {
  workflowKey: string;
  subscriberId: string;
  email?: string;
  phone?: string;
  deviceTokens?: string[]; // push/mobile
  payload?: Record<string, any>;
  channelsOverride?: {
    inApp?: boolean;
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
}
```

### 3.2. Mapping sang Novu workflow & channel preferences

- Trên Novu:
  - Tạo workflows cho từng use case, config channel preferences (In-app, Email, SMS, Push).
  - Sử dụng `workflow channel preferences` và `subscriber preferences`.

- Trong code:
  - `payload` mang theo dữ liệu template (title, body, link…).
  - `channelsOverride` có thể dùng để quyết định workflow nào được trigger.

### 3.3. Quản lý Subscriber & Channel Settings

- Khi user đăng ký/đăng nhập:
  - Đồng bộ subscriber sang Novu (nếu chưa tồn tại).
  - Cập nhật:
    - Email
    - Phone
    - Push device tokens (FCM/APNs)
    - Web push subscription (nếu có)

- Logic (pseudo):

```ts
async upsertSubscriber({
  subscriberId,
  email,
  phone,
  deviceTokens,
}: {
  subscriberId: string;
  email?: string;
  phone?: string;
  deviceTokens?: string[];
}) {
  // Gọi Novu API tạo/cập nhật subscriber + channel settings
}
```

### 3.4. Nhận webhook trạng thái từ Novu

- Tạo controller, ví dụ: `NovuWebhookController`.
- Các event:
  - delivered / error / seen / action-clicked / read / unread…
- Cập nhật:
  - DB `notification_logs`
  - Redis cache trạng thái `notification:status:{id}`

Pseudo:

```ts
@Post('/webhooks/novu')
async handleNovuWebhook(@Body() body: any, @Headers('x-novu-signature') sig: string) {
  // TODO: verify signature nếu có
  const event = body?.type;
  const notificationId = body?.data?.notificationId;

  await this.notificationLogService.updateStatus(notificationId, event);
}
```

### 3.5. In-app Feed API

```ts
@Get('/notifications/in-app')
async getInAppNotifications(@Req() req) {
  const userId = req.user.id;
  return this.notificationQueryService.getInAppFeed(userId);
}
```

`notificationQueryService` có thể:
- Đọc từ DB (đã sync từ webhook).
- Hoặc gọi Novu API trực tiếp, tuỳ chiến lược.

### 3.6. Push/Mobile

- Trên Novu:
  - Cấu hình Push channel (FCM/APNs hoặc provider khác).
  - Map subscriber → credentials (device token).
- Trên app mobile:
  - Nhận push từ FCM/APNs.
  - Khi user tap notification:
    - Call API backend đánh dấu notification “seen”/“read”.

> Mục tiêu Senior: Làm chủ luồng **đa kênh** và sync hai chiều giữa backend ↔ Novu ↔ client.

---

## 4. Principal — Kiến trúc hoá & Mở rộng

### 4.1. Trừu tượng hoá Provider

- Định nghĩa interface:

```ts
export interface NotificationProvider {
  trigger(params: {
    workflowKey: string;
    subscriberId: string;
    channels?: string[];
    payload?: Record<string, any>;
  }): Promise<void>;
}
```

- `NovuProvider` implements `NotificationProvider`.
- Có thể thêm `AwsSnsProvider`, `InHouseProvider` trong tương lai.

### 4.2. Bounded Context & Microservice

- Tách module notification thành service riêng:
  - Giao tiếp qua message bus (Kafka/NATS/RabbitMQ).
  - Redis queue/Redis cache có thể trở thành implementation detail bên trong service này.

### 4.3. Multi-tenant & Versioning workflows

- Mỗi tenant có:
  - Namespace riêng cho workflows.
  - Preferences & rate limit riêng.
- Versioning workflow:
  - `order-status-v1`, `order-status-v2`…
  - Cho phép rollout dần, A/B test trên 1 phần user.

### 4.4. Observability & SRE

- Log/trace:
  - Correlation ID xuyên suốt: API → queue → worker → Novu → webhook → DB.
- Metrics:
  - Số lượng notification theo kênh.
  - Error rate per provider/channel.
  - Latency trung bình từ request đến delivered.

> Mục tiêu Principal: Thiết kế hệ thống **mở rộng, an toàn, quan sát được**, dễ thay thế provider và phù hợp cho nhiều product/team khác nhau.


