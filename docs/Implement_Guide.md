# Implement_Guide: Hướng Dẫn Triển Khai Module NestJS + Novu Theo Cấp Độ

## Mục Lục

1. Junior – Dùng Module Có Sẵn Trong Một Project
2. Middle – Tích Hợp Chuẩn, Tách Bạch Trong Monolith / Modular Monolith
3. Senior – Thiết Kế Tích Hợp Theo Sự Kiện, Đa Dự Án, Đa Môi Trường
4. Principal – Góc Nhìn Platform, Multi‑tenant, Observability & Governance

---

## 1. Junior – Dùng Module Có Sẵn Trong Một Project

> **Mục tiêu**: Dev junior có thể **gọi được notification** từ service hiện tại mà không cần hiểu sâu về Novu.

### 1.1. Checklist Kỹ Năng

- Biết thêm `NotificationModule` vào `AppModule`.
- Biết cấu hình **env cơ bản**: `NOVU_API_KEY`, `NOVU_SERVER_URL`, `NOVU_APP_ID`.
- Biết gọi `NotificationService.sendNotification()` từ service domain.

### 1.2. Các Bước Triển Khai

#### Bước 1 – Cài package

```bash
npm install @nestjs/config @novu/api
```

#### Bước 2 – Khai báo biến môi trường

```env
NOVU_API_KEY=your_novu_api_key
NOVU_SERVER_URL=https://api.novu.co
NOVU_APP_ID=your_novu_app_id   # nếu dùng In‑App Inbox
```

> **Fail fast**: Module sẽ kiểm tra `NOVU_API_KEY` (và các biến yêu cầu khác) khi bootstrap. Nếu thiếu, ứng dụng sẽ throw error ngay khi start để tránh chạy với cấu hình không hợp lệ.

Ví dụ block code kiểm tra env trong provider/module:

```ts
// notification.config.ts (hoặc trong NovuProvider)
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationConfig {
  constructor(private readonly configService: ConfigService) {}

  get apiKey(): string {
    const value = this.configService.get<string>('NOVU_API_KEY');
    if (!value) {
      throw new Error(
        '[NotificationModule] Missing NOVU_API_KEY. Please set it in environment variables.',
      );
    }
    return value;
  }

  get serverUrl(): string | undefined {
    return this.configService.get<string>('NOVU_SERVER_URL');
  }

  get appId(): string | undefined {
    return this.configService.get<string>('NOVU_APP_ID');
  }
}

// NovuProvider sử dụng NotificationConfig
@Injectable()
export class NovuProvider implements NotificationProvider {
  private readonly novu: Novu;

  constructor(private readonly notificationConfig: NotificationConfig) {
    this.novu = new Novu({
      secretKey: this.notificationConfig.apiKey,          // đã được validate
      serverURL: this.notificationConfig.serverUrl,
    });
  }
}
```

#### Bước 3 – Import module

```ts
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NotificationModule.forRoot(),
  ],
})
export class AppModule {}
```

#### Bước 4 – Gọi gửi thông báo từ service

```ts
// order.service.ts
import { Injectable } from '@nestjs/common';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class OrderService {
  constructor(private readonly notificationService: NotificationService) {}

  async createOrder(dto: CreateOrderDto) {
    const order = await this.orderRepository.save(dto);

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
    });

    return order;
  }
}
```

### 1.3. Lưu Ý Cho Junior

- **Không đổi logic** business (tạo order, thanh toán, v.v.), chỉ **gắn thêm call** `sendNotification()` sau khi thao tác thành công.
- Nếu lỗi Novu (API key sai, network), log lỗi lại và hỏi senior, **không tự ý ignore toàn bộ lỗi**.

---

## 2. Middle – Tích Hợp Chuẩn, Tách Bạch Trong Monolith / Modular Monolith

> **Mục tiêu**: Middle dev hiểu cấu trúc module, viết DTO/mapper, và biết tách notification khỏi business bằng events hoặc service layer rõ ràng.

### 2.1. Checklist Kỹ Năng

- Hiểu cấu trúc `notification-module/` trong `ARCHITECTURE.md`.
- Thiết kế **DTO riêng của domain** → map sang `SendNotificationDto`.
- Dùng **domain events / application events** để không gọi thẳng notification từ mọi nơi.

### 2.2. Tách DTO Domain và DTO Notification

```ts
// domain/dto/order-notification.dto.ts
export class OrderCreatedNotificationPayload {
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  userId: string;
  userEmail: string;
}

// mapping sang SendNotificationDto ở NotificationMapper
export class NotificationMapper {
  static orderCreatedToSendDto(
    payload: OrderCreatedNotificationPayload,
  ): SendNotificationDto {
    return {
      to: {
        subscriberId: payload.userId,
        email: payload.userEmail,
      },
      workflowId: 'order-confirmation',
      payload: {
        orderId: payload.orderId,
        orderNumber: payload.orderNumber,
        totalAmount: payload.totalAmount,
      },
    };
  }
}
```

### 2.3. Dùng Domain Event (NestJS CQRS hoặc EventBus tự viết)

```ts
// order-created.event.ts
export class OrderCreatedEvent {
  constructor(public readonly payload: OrderCreatedNotificationPayload) {}
}

// order.service.ts
this.eventBus.publish(new OrderCreatedEvent(orderNotificationPayload));

// order-created.handler.ts
@EventsHandler(OrderCreatedEvent)
export class OrderCreatedHandler implements IEventHandler<OrderCreatedEvent> {
  constructor(private readonly notificationService: NotificationService) {}

  async handle(event: OrderCreatedEvent) {
    const dto = NotificationMapper.orderCreatedToSendDto(event.payload);
    await this.notificationService.sendNotification(dto);
  }
}
```

### 2.4. Cấu Hình NotificationModule Cho Nhiều Domain

Ở level middle, bạn có thể bắt đầu cấu hình **nhiều workflowId** cho các domain khác nhau (order, billing, auth, v.v.) thông qua 1 file config hoặc mapping table.

```ts
// notification.config.ts
export const NotificationWorkflows = {
  order: {
    confirmation: 'order-confirmation',
  },
  auth: {
    otp: 'otp-sms',
  },
} as const;
```

### 2.5. Lưu Ý Cho Middle

- Đảm bảo những chỗ gọi notification **tập trung** (qua handler / application service), tránh rải rác khắp code.
- Bắt đầu quan tâm tới: **retry, idempotency**, logging khi Novu trả lỗi.

### 2.6. API Nội Bộ Để Đăng Ký Workflow (Code-First) – Level Middle

> **Trường hợp sử dụng**: team backend muốn có **API nội bộ** để CI/CD hoặc admin tool có thể đăng ký thêm workflow trên Novu mà không phải vào Dashboard chỉnh tay.

#### 2.6.1. Định nghĩa DTO ở backend chính

DTO này nên gần giống `CreateWorkflowDto` trong `ARCHITECTURE.md`, có thể đơn giản hoá cho nhu cầu hiện tại:

```ts
// dto/create-novu-workflow.dto.ts
export class CreateNovuWorkflowRequest {
  workflowId: string;
  name: string;
  description?: string;
  tags?: string[];
  steps: {
    name: string;
    type: 'email' | 'sms' | 'in_app' | 'push' | 'chat';
    controlValues: {
      body: string;
      subject?: string;
      title?: string;
    };
  }[];
}
```

#### 2.6.2. Controller ở backend chính

```ts
// notifications-workflow.controller.ts
@Controller('internal/notifications/workflows')
export class NotificationsWorkflowController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  async createWorkflow(@Body() body: CreateNovuWorkflowRequest) {
    // Map DTO của root app → CreateWorkflowDto trong module (nếu khác nhau)
    const result = await this.notificationService.createWorkflow(body);
    return result; // WorkflowResult
  }

  @Put(':workflowId')
  async updateWorkflow(
    @Param('workflowId') workflowId: string,
    @Body() body: UpdateNovuWorkflowRequest,
  ) {
    const result = await this.notificationService.updateWorkflow(workflowId, body);
    return result;
  }

  @Delete(':workflowId')
  async deleteWorkflow(@Param('workflowId') workflowId: string) {
    await this.notificationService.deleteWorkflow(workflowId);
    return { success: true };
  }
}
```

#### 2.6.3. Vai trò của NotificationService trong module

- Cung cấp các method:
  - `createWorkflow(dto: CreateWorkflowDto): Promise<WorkflowResult>`
  - `updateWorkflow(workflowId: string, dto: UpdateWorkflowDto): Promise<WorkflowResult>`
  - `deleteWorkflow(workflowId: string): Promise<void>`
- Nội bộ service sẽ:
  - Validate DTO.
  - Map sang payload `POST/PUT/DELETE /v2/workflows` của Novu.
  - Gọi `NovuProvider` để thực hiện.

#### 2.6.4. Code mẫu `NotificationService` cho create/update/delete workflow

```ts
// notification.service.ts (phần quản lý workflow)
import { Injectable, Inject } from '@nestjs/common';
import { NotificationProvider } from './providers/notification.provider.interface';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowResult,
} from './interfaces/workflow.interface';

@Injectable()
export class NotificationService {
  constructor(
    @Inject('NOTIFICATION_PROVIDER')
    private readonly provider: NotificationProvider,
  ) {}

  // ... các method sendNotification, subscriber, preferences (như ở phần trên) ...

  /**
   * Tạo workflow trên Novu (code-first)
   * Map CreateWorkflowDto -> POST /v2/workflows
   */
  async createWorkflow(dto: CreateWorkflowDto): Promise<WorkflowResult> {
    if (!dto.workflowId) {
      throw new Error('workflowId is required');
    }
    if (!dto.name) {
      throw new Error('name is required');
    }
    if (!dto.steps || dto.steps.length === 0) {
      throw new Error('steps is required');
    }

    // Uỷ quyền cho provider thực hiện call thực tế
    return this.provider.createWorkflow(dto);
  }

  /**
   * Cập nhật workflow trên Novu
   * Map UpdateWorkflowDto -> PUT /v2/workflows/{workflowId}
   */
  async updateWorkflow(
    workflowId: string,
    dto: UpdateWorkflowDto,
  ): Promise<WorkflowResult> {
    if (!workflowId) {
      throw new Error('workflowId (path param) is required');
    }

    // Có thể bổ sung validate dto tuỳ nhu cầu (tên mới, steps mới, v.v.)
    return this.provider.updateWorkflow(workflowId, dto);
  }

  /**
   * Xoá workflow trên Novu
   * Map -> DELETE /v2/workflows/{workflowId}
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    if (!workflowId) {
      throw new Error('workflowId (path param) is required');
    }

    await this.provider.deleteWorkflow(workflowId);
  }
}
```

> Gợi ý:
> - Ở `NotificationProvider` (ví dụ `NovuProvider`) bạn hiện thực `createWorkflow/updateWorkflow/deleteWorkflow` bằng cách gọi trực tiếp:
>   - `POST /v2/workflows`
>   - `PUT /v2/workflows/{workflowId}`
>   - `DELETE /v2/workflows/{workflowId}`
>   thông qua `@novu/api` hoặc HTTP client riêng.
> - Ở backend chính, controller nội bộ (`NotificationsWorkflowController`) chỉ cần gọi 3 method này, như ở mục 2.6.2.

---

## 3. Senior – Thiết Kế Tích Hợp Theo Sự Kiện, Đa Dự Án, Đa Môi Trường

> **Mục tiêu**: Senior định hình cách module này sống trong kiến trúc backend lớn: event‑driven, microservices, multi‑env, multi‑region.

### 3.1. Checklist Kỹ Năng

- Hiểu rõ **layering**: domain → application → notification module → Novu.
- Biết thiết kế **notification‑service riêng** (microservice hoặc bounded context).
- Hiểu **inputs/outputs** của Novu (subscribers, triggers, preferences, workflows v2 API).

### 3.2. Dùng Message Broker (RabbitMQ / Kafka / SQS)

Thay vì gọi trực tiếp `NotificationService` từ mọi service, bạn có thể:

1. Các service publish event lên queue/topic.
2. Notification service (gắn `NotificationModule`) subscribe và gửi qua Novu.

```ts
// billing-service publish
this.eventBus.publish('billing.invoice.paid', {
  invoiceId,
  userId,
  amount,
});

// notification-service consumer (pseudo)
@MessagePattern('billing.invoice.paid')
async handleInvoicePaid(event: InvoicePaidEvent) {
  const dto = BillingNotificationMapper.invoicePaidToSendDto(event);
  await this.notificationService.sendNotification(dto);
}
```

### 3.3. Nhiều Môi Trường (dev/stage/prod) & Nhiều Project

- Mỗi môi trường có **Novu environment riêng** (keys riêng).
- Senior nên chuẩn hóa **config schema** cho module:

```ts
export interface NotificationModuleOptions {
  novu: {
    apiKey: string;
    serverUrl?: string;
    appId?: string;
  };
  defaults?: {
    region?: 'us' | 'eu';
  };
}

NotificationModule.forRoot({
  novu: {
    apiKey: process.env.NOVU_API_KEY,
    serverUrl: process.env.NOVU_SERVER_URL,
    appId: process.env.NOVU_APP_ID,
  },
});
```

### 3.4. Strategy Cho Channel & Preferences

Senior có thể đẩy phần **lựa chọn kênh** (Email/SMS/Push) về:

- Workflow trong Novu (conditions, channel toggles).
- Hoặc 1 layer **Domain Notification Policy** trong backend:

```ts
export class NotificationPolicyService {
  async buildChannelsForImportant(user: User, isUrgent: boolean) {
    const prefs = await this.notificationService.getSubscriberPreferences(user.id);

    return {
      email: prefs.email.enabled ? user.email : undefined,
      phone: prefs.sms.enabled && isUrgent ? user.phone : undefined,
    };
  }
}
```

### 3.5. Webhook Trạng Thái Từ Novu → Backend

> Dùng khi bạn muốn **theo dõi lifecycle** của notification (DELIVERED/BOUNCED/OPENED/CLICKED/...), không chỉ biết "đã trigger thành công".

#### 3.5.1. Tổng Quan

Module core cung cấp:
- **Interfaces**: `NovuWebhookEvent`, `NotificationLog`, `NotificationStatusIRepository`
- **Mẫu Code**: Controller, Service, Entity trong `docs/examples/`

**Lưu ý**: Module core **không tự tạo controller** để tránh coupling với routing/security của từng dự án. Project host cần tự tạo controller và service dựa trên mẫu.

#### 3.5.2. Các Bước Triển Khai

**Bước 1: Tạo Entity và Repository**

1. Copy mẫu entity từ `docs/examples/notification-log.entity.example.ts`
2. Tùy chỉnh theo ORM của bạn (TypeORM, Prisma, Mongoose)
3. Tạo migration để tạo bảng `notification_logs`
4. Implement `NotificationStatusIRepository` interface

**Bước 2: Tạo Service**

1. Copy mẫu service từ `docs/examples/notification-status.service.example.ts`
2. Inject repository đã implement
3. Tùy chỉnh logic phát domain events (nếu cần)

**Bước 3: Tạo Controller**

1. Copy mẫu controller từ `docs/examples/novu-webhook.controller.example.ts`
2. Tùy chỉnh path, guard, middleware theo nhu cầu
3. Register controller trong module

**Bước 4: Cấu Hình Novu Dashboard**

1. Vào **Novu Dashboard** → **Project Settings** → **Webhooks**
2. Bật **Outbound Webhook**
3. Đặt URL: `POST https://your-api.com/internal/webhooks/novu`
4. (Khuyến nghị) Cấu hình **Secret** để verify signature

#### 3.5.3. Ví Dụ Implementation

Xem chi tiết trong:
- `docs/docs-notification/WEBHOOK_INTEGRATION.md`: Hướng dẫn tích hợp đầy đủ
- `docs/examples/`: Mẫu code cho controller, service, entity

#### 3.5.4. Best Practices

- **Idempotency**: Sử dụng `externalId` (event.id) làm unique key
- **Security**: Verify webhook signature với Svix
- **Performance**: Trả `200 OK` sớm, xử lý async nếu cần
- **Error Handling**: Log lỗi nhưng không throw để tránh retry không cần thiết

#### 3.5.5. Kết Nối Với Các Bounded Context Khác

- Cập nhật bảng audit / activity cho user
- Trigger logic tiếp theo (ví dụ: nếu email bounce nhiều lần → khóa gửi marketing cho email đó)
- Đẩy dữ liệu sang BI/analytics
- Phát domain events (`NotificationDelivered`, `NotificationBounced`, v.v.)

### 3.6. Lưu Ý Cho Senior

- Bắt đầu nghĩ đến: **observability** (metrics: số notification theo workflow, fail rate, latency), **backpressure** khi bulk.
- Thiết kế module sao cho có thể **publish events** (ví dụ `NotificationSent`, `NotificationFailed`) để các bounded context khác subscribe.

---

## 4. Principal – Góc Nhìn Platform, Multi‑tenant, Observability & Governance

> **Mục tiêu**: Principal xem module này như một **Notification Platform** dùng chung cho toàn công ty, không chỉ 1 project.

### 4.1. Checklist Kỹ Năng

- Nhìn module này như 1 **sản phẩm nội bộ** (internal platform): versioning, backward compatibility.
- Thiết kế cho **multi‑tenant**, nhiều product/brand dùng chung.
- Chính sách **governance**: ai tạo workflow, ai deploy, review thế nào.

### 4.2. Multi‑tenant & Multi‑product

Một số chiến lược:

- **Tenant ở cấp Novu environment**: mỗi tenant 1 project/Env riêng.
- Hoặc **tenant trong payload / subscriber data**: `subscriber.data.tenantId`, `workflowId` có prefix `tenantA-order-confirmation`.

Backend module cần support:

```ts
export interface TenantAwareSendNotificationDto extends SendNotificationDto {
  tenantId: string;
}

// Mapping sang workflowId theo tenant
function mapTenantWorkflow(tenantId: string, key: string): string {
  return `${tenantId}-${key}`; // ví dụ: tenantA-order-confirmation
}
```

### 4.3. API Platform Nội Bộ

Principal có thể đóng gói module này thành **internal package** (monorepo lib hoặc private npm):

- `@company/notification-core` – chứa abstraction, DTO, interfaces.
- `@company/notification-novu` – implementation cụ thể dùng Novu.

Kiến trúc:

```
Product A  ─┐
Product B  ─┼─>  @company/notification-core  ──>  @company/notification-novu  ──> Novu
Product C  ─┘
```

### 4.4. Security & Compliance

- Sử dụng **HMAC** cho Inbox (`subscriberHash`) để tránh giả mạo `subscriberId` trên frontend.
- Quản lý `NOVU_API_KEY` qua **secret manager** (Vault, AWS Secrets Manager, GCP Secret Manager).
- Audit: log full lifecycle của notification quan trọng (who/when/what channel).

### 4.5. Observability & SLOs

- Định nghĩa **SLO** cho notification, ví dụ:
  - 99% notification `important-*` được trigger thành công trong < 2s.
  - Error rate cho workflow `order-confirmation` < 0.1%.
- Kết nối metrics/telemetry từ module vào stack giám sát (Prometheus, Grafana, Datadog,...).

### 4.6. Governance Cho Workflow

- Quy ước:
  - Dev chỉ **gọi đúng workflowId chuẩn hóa** (documented), không tự tiện tạo id mới.
  - Thay đổi nội dung notification (copy, template) nên qua **product/marketing** nhưng trong khuôn khổ schemas đã define.
- Có **review process**: thay đổi workflow phải được tech review (đảm bảo giữ đúng contract payload).

---

**Kết luận**: File này là “cầu nối” giữa tài liệu kiến trúc (ARCHITECTURE.md) và triển khai thực tế. Mỗi cấp độ có checklist riêng, nhưng tất cả vẫn xoay quanh cùng một abstraction: `NotificationService` (backend) + Novu (notification engine).
