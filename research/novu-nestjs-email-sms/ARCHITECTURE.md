## Mức Junior – Tổng quan kiến trúc gửi Email & SMS với NestJS + Novu

### Mục tiêu
- **Hiểu bức tranh lớn**: Backend NestJS gọi Novu để gửi Email/SMS.
- **Biết các thành phần chính**: Module, Service, Controller, DTO.
- **Biết luồng đơn giản**: API → Service → Novu → Email/SMS tới User.

### Tổng quan kiến trúc
- **Client (Web/App)**:
  - Gửi request (HTTP/REST) tới NestJS để yêu cầu gửi email/SMS (ví dụ `/notifications/send`).
- **NestJS Backend**:
  - **Controller** nhận request và validate input (DTO).
  - **Service** gọi SDK/REST của Novu để trigger workflow (event) gửi thông báo.
  - **Config Module** đọc các biến môi trường như `NOVU_API_KEY`.
- **Novu Cloud**:
  - **Workflow** (đã cấu hình trên Novu hoặc bằng Novu Framework) quyết định:
    - Gửi qua kênh **Email** nào, **SMS** nào.
    - Dùng **template** nào.
  - **Integrations** (SendGrid, SES, Twilio, v.v.) thực sự gửi email/SMS tới user.

### Kiến trúc lớp & cấu trúc thư mục (đơn giản)
- **Lớp Controller**: Nhận HTTP request.
- **Lớp Service**: Chứa logic gọi Novu.
- **Lớp DTO**: Định nghĩa dữ liệu vào/ra.
- **Lớp Config**: Đọc biến môi trường, cấu hình khóa API.

Ví dụ cấu trúc thư mục:

```text
src/
  notifications/
    notifications.module.ts
    notifications.controller.ts
    notifications.service.ts
    dto/
      send-notification.dto.ts
  app.module.ts
```

### Dependencies & Environment Variables (cần nhớ)
- **NPM packages cơ bản**:
  - `@nestjs/common`, `@nestjs/core`, `@nestjs/config`, `@nestjs/swagger` (tùy chọn).
  - `@novu/api` hoặc dùng trực tiếp REST API của Novu bằng `axios`/`node-fetch`.
- **Biến môi trường quan trọng**:
  - `NOVU_API_KEY`: Secret key để gọi Novu Cloud.
  - `NOVU_API_URL` (tùy chọn, mặc định `https://api.novu.co`).
  - Thông tin cho integration (thường cấu hình trong Novu UI, không trong app).

Ví dụ `.env`:

```bash
NOVU_API_KEY=your_novu_api_key_here
NOVU_API_URL=https://api.novu.co
```

### Luồng hoạt động (Email & SMS – cơ bản)
1. Client gửi request `POST /notifications/send` với thông tin user + nội dung.
2. Controller map body vào DTO `SendNotificationDto`.
3. Service gọi Novu:
   - Dùng SDK `@novu/api` hoặc gọi `POST /v1/events/trigger`.
4. Novu nhận event:
   - Match với **Workflow** (ví dụ `user-registration`, `order-confirmation`).
   - Workflow quyết định:
     - Gửi Email (SendGrid/SES/SMTP…).
     - Gửi SMS (Twilio, etc.).
5. User nhận Email/SMS.

### Luồng dữ liệu (DTO, data structures – đơn giản)
- **Request DTO** (từ client → NestJS):

```typescript
export class SendNotificationDto {
  email?: string;
  phone?: string;
  channel: 'email' | 'sms' | 'both';
  templateName: string; // tên workflow/event trong Novu
  payload: Record<string, any>; // dữ liệu dynamic cho template
}
```

- **Data gửi sang Novu** (NestJS → Novu):

```typescript
{
  name: templateName,
  to: {
    subscriberId: 'user-123',
    email: dto.email,
    phone: dto.phone,
  },
  payload: dto.payload
}
```

### 5 Use Case thực tế (ở mức junior)
- **1. Gửi email xác nhận đăng ký tài khoản**:
  - Khi user đăng ký xong, backend gọi Novu workflow `user-registration-email`.
- **2. Gửi SMS OTP đăng nhập 2 bước**:
  - Khi user login, backend gọi workflow `login-otp-sms`.
- **3. Gửi email xác nhận đặt đơn hàng**:
  - Sau khi tạo order, gửi email `order-confirmation-email`.
- **4. Gửi SMS thông báo đơn hàng đã giao**:
  - Khi status order = `DELIVERED`, trigger workflow `order-delivered-sms`.
- **5. Gửi cả email + SMS nhắc gia hạn gói dịch vụ**:
  - Trước ngày hết hạn 3 ngày, chạy job cron → backend gọi workflow `subscription-renewal-reminder` (có cả email & SMS).

### Code ví dụ đơn giản (NestJS + Novu Cloud – Email & SMS)

```typescript
// notifications.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { SendNotificationDto } from './dto/send-notification.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly novuApiKey: string;
  private readonly novuApiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.novuApiKey = this.configService.get<string>('NOVU_API_KEY');
    this.novuApiUrl =
      this.configService.get<string>('NOVU_API_URL') ?? 'https://api.novu.co';
  }

  async send(dto: SendNotificationDto) {
    const channels =
      dto.channel === 'both' ? ['email', 'sms'] : [dto.channel];

    const body = {
      name: dto.templateName, // tên workflow/event trong Novu
      to: {
        subscriberId: dto.payload.userId ?? 'anonymous',
        email: dto.email,
        phone: dto.phone,
      },
      payload: {
        ...dto.payload,
        channels,
      },
    };

    try {
      const response = await axios.post(
        `${this.novuApiUrl}/v1/events/trigger`,
        body,
        {
          headers: {
            Authorization: `ApiKey ${this.novuApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      this.logger.log(`Novu trigger success: ${response.data.data?.status}`);
      return response.data;
    } catch (error: any) {
      this.logger.error('Novu trigger failed', error?.response?.data ?? error);
      throw error;
    }
  }
}
```

```typescript
// notifications.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SendNotificationDto } from './dto/send-notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post('send')
  async send(@Body() dto: SendNotificationDto) {
    return this.notificationsService.send(dto);
  }
}
```

---

## Mức Middle – Thiết kế module & workflow rõ ràng hơn

### Mục tiêu
- **Chuẩn hóa module `NotificationsModule`**.
- **Tách cấu hình, DTO, service** rõ ràng.
- **Hiểu cách thiết kế workflow trên Novu cho Email + SMS**.

### Kiến trúc lớp & module cho dự án thật
- **Module tách biệt**:
  - `NotificationsModule` chịu trách nhiệm cho tất cả logic gửi thông báo.
  - Import `ConfigModule` để đọc biến môi trường.
- **Service interface (abstraction)**:
  - Định nghĩa interface `INotificationChannel` nếu sau này muốn thay Novu.
- **Controller**:
  - Chỉ chứa nghiệp vụ nhẹ (mapping request → service).

Ví dụ module:

```typescript
// notifications.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [ConfigModule],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

### Workflow trên Novu (Email + SMS)
- Mỗi **workflow** (event) trong Novu sẽ:
  - Có **ID / name**: ví dụ `user-registration`, `order-confirmation`, `subscription-renewal`.
  - Bên trong workflow:
    - **Step Email**: gửi email template A.
    - **Step SMS**: gửi SMS template B.
    - Có thể thêm **conditions**:
      - Chỉ gửi SMS nếu có `phone`.
      - Chỉ gửi Email nếu có `email`.

### Luồng dữ liệu chi tiết (DTO chuyên biệt)
- Thay vì một DTO chung, có thể tách:
  - `SendEmailDto`
  - `SendSmsDto`
  - `SendMultiChannelNotificationDto`

```typescript
export class SendEmailDto {
  email: string;
  templateName: string;
  payload: Record<string, any>;
}

export class SendSmsDto {
  phone: string;
  templateName: string;
  payload: Record<string, any>;
}
```

Sau đó `NotificationsService` có thể có nhiều method:

```typescript
async sendEmail(dto: SendEmailDto) { /* ... */ }
async sendSms(dto: SendSmsDto) { /* ... */ }
async sendMultiChannel(dto: SendNotificationDto) { /* ... */ }
```

### Data flow từ DB → DTO → Novu
- **B1**: Repository lấy dữ liệu `User` (email, phone, name).
- **B2**: Service domain mapping sang DTO phù hợp.
- **B3**: `NotificationsService` map DTO sang payload của Novu:
  - `to.email`, `to.phone`.
  - `payload` chứa thông tin business (orderId, amount, expireAt, v.v.).

### Use Cases – phân tích theo nghiệp vụ
- **1. Welcome Email + SMS sau khi đăng ký**:
  - Path: `AuthService.register()` → `NotificationsService.sendMultiChannel(...)`.
- **2. Reset Password (Email + optional SMS)**:
  - Gửi link reset qua email, và SMS chỉ nhắc “check email”.
- **3. Order Confirmed (Email)**:
  - Chứa chi tiết đơn hàng, tổng tiền, thời gian giao dự kiến.
- **4. Order Delivered (SMS)**:
  - Thông báo ngắn gọn kèm mã đơn.
- **5. Subscription Renewal Reminder (Email + SMS)**:
  - Gửi trước 3–7 ngày; có link gia hạn & hotline.

### Ví dụ code – tách method cho Email & SMS

```typescript
// notifications.service.ts (rút gọn cho middle level)
async sendEmail(dto: SendEmailDto) {
  return this.triggerNovu({
    name: dto.templateName,
    to: {
      subscriberId: dto.payload.userId ?? dto.email,
      email: dto.email,
    },
    payload: dto.payload,
  });
}

async sendSms(dto: SendSmsDto) {
  return this.triggerNovu({
    name: dto.templateName,
    to: {
      subscriberId: dto.payload.userId ?? dto.phone,
      phone: dto.phone,
    },
    payload: dto.payload,
  });
}

private async triggerNovu(body: any) {
  const response = await axios.post(
    `${this.novuApiUrl}/v1/events/trigger`,
    body,
    {
      headers: {
        Authorization: `ApiKey ${this.novuApiKey}`,
        'Content-Type': 'application/json',
      },
    },
  );
  return response.data;
}
```

---

## Mức Senior – Tích hợp Novu Framework & kiến trúc phân lớp

### Mục tiêu
- **Kết hợp Novu Cloud + Novu Framework**:
  - Viết workflow bằng code (TypeScript) chạy cạnh NestJS.
  - Giao tiếp với Novu Cloud Worker.
- **Thiết kế nhiều tầng**:
  - API layer, Application layer, Domain layer, Infrastructure layer.

### Layered Architecture đề xuất
- **Presentation Layer (API)**:
  - NestJS `Controller` + DTO + Validation.
- **Application Layer**:
  - `NotificationUseCases` (application services) xử lý:
    - `SendWelcomeNotificationUseCase`
    - `SendOrderConfirmationUseCase`
  - Dùng các interface từ domain.
- **Domain Layer**:
  - `Notification` entity/value objects.
  - `INotificationGateway` interface (abstract Novu).
- **Infrastructure Layer**:
  - `NovuNotificationGateway` implement `INotificationGateway`.
  - Ở đây dùng `@novu/api` hoặc HTTP client.
  - Có thể có thêm `NovuFramework` workflows code-first.

Sơ đồ đơn giản:

```text
Controller -> UseCase (Application) -> INotificationGateway (Domain) -> NovuNotificationGateway (Infra) -> Novu API/Framework
```

### Cấu trúc thư mục gợi ý

```text
src/
  modules/
    notifications/
      application/
        use-cases/
          send-welcome-notification.usecase.ts
          send-order-confirmation.usecase.ts
      domain/
        entities/
        interfaces/
          notification-gateway.interface.ts
      infra/
        novu/
          novu-notification.gateway.ts
      presentation/
        notifications.controller.ts
      notifications.module.ts
```

### Tích hợp Novu Framework (code-first workflows)
- Bạn có thể chạy **Novu Framework app** (Express/Nest) cạnh NestJS hoặc chung codebase.
- Ví dụ workflow TypeScript:

```typescript
// workflows/order-confirmation.ts
import { workflow } from '@novu/framework';
import { z } from 'zod';

export const orderConfirmationWorkflow = workflow(
  'order-confirmation',
  async ({ payload, step, subscriber }) => {
    // Step 1: gửi email
    await step.email('order-confirmation-email', async () => ({
      subject: `Order ${payload.orderId} confirmed`,
      body: `Hi ${subscriber.firstName}, your order total is ${payload.amount}`,
    }));

    // Step 2: gửi SMS
    await step.sms('order-confirmation-sms', async () => ({
      content: `Your order ${payload.orderId} (${payload.amount}) has been confirmed.`,
    }));
  },
  {
    payloadSchema: z.object({
      orderId: z.string(),
      amount: z.string(),
    }),
  },
);
```

Backend NestJS có thể **trigger** workflow này giống như trigger event cho Novu Cloud:

```typescript
await orderConfirmationWorkflow.trigger({
  to: 'user-123',
  payload: {
    orderId: 'ORD-123',
    amount: '$99.99',
  },
});
```

### Data flow phức tạp hơn
- **DB / Domain**:
  - Entity `Order`, `User`.
- **UseCase**:
  - Build `NotificationPayload` từ domain entity (không lộ internal fields).
- **Gateway**:
  - Map `NotificationPayload` sang payload của Novu (email, sms, overrides…).
- **Novu Framework**:
  - Validate payload bằng `zod`.
  - Quyết định logic multi-step (email + sms + digest + retry…).

### Use Cases nâng cao (Senior)
- **1. Notification preference per user**:
  - User A chỉ muốn email, User B muốn cả email + sms.
  - Lưu config trong DB, mapping sang Novu (channel preferences).
- **2. Digest Email mỗi ngày + SMS chỉ khi có sự kiện quan trọng**.
- **3. Multi-tenant (mỗi workspace/company 1 sender khác nhau)**.
- **4. Track trạng thái delivery (delivered, bounced, failed)**.
- **5. Idempotent trigger (tránh gửi trùng)** dựa trên `transactionId`.

---

## Mức Principal – Kiến trúc hệ thống notification tách rời & chiến lược dài hạn

### Mục tiêu
- **Thiết kế hệ thống notification như một “subsystem” riêng**.
- **Có khả năng mở rộng kênh (Push, In-App, Chat) mà không đổi core API**.
- **Đảm bảo reliability, observability, compliance**.

### Kiến trúc tổng thể (macro)
- **Notification Service (Microservice)**:
  - NestJS + Novu integration.
  - Expose:
    - **HTTP API** nội bộ: `/internal/notifications/send`.
    - Hoặc **message-based** (RabbitMQ, Kafka) để nhận event.
- **Core Business Services** (Auth, Billing, Orders…):
  - Không gọi Novu trực tiếp, mà publish event:
    - `user.registered`
    - `order.created`
    - `subscription.expiring`
  - Notification Service subscribe và quyết định gửi Email/SMS qua Novu.

### Mô hình Event-Driven + Novu
- **Step 1**: Service khác publish event lên message broker.
- **Step 2**: Notification Service consume event:
  - Ánh xạ `event.type` → workflow trên Novu.
  - Build payload + context.
- **Step 3**: Notification Service trigger Novu event/workflow.

### Quản lý template & phiên bản (template versioning)
- Template & workflow được quản lý **trong Novu** (UI + Framework).
- Backend:
  - Chỉ cần pass **payload chuẩn** + `name`/`workflowId`.
  - Cho phép product/marketing update nội dung mà không release code.

### Chính sách & bảo mật (Principal)
- Không log full nội dung email/SMS nếu chứa PII/secret.
- Mask phone/email trong logs.
- Rotate `NOVU_API_KEY`, dùng secret manager (AWS Secrets Manager, Vault…).
- Rate limiting & backpressure khi queue notification tăng cao.

### Multi-region & resiliency
- Notification Service có thể:
  - Đặt gần region mà Novu dùng.
  - Có retry với exponential backoff khi Novu error.

### Tóm tắt
- **Junior**: Hiểu API → Service → Novu → Email/SMS.
- **Middle**: Biết thiết kế module, DTO, workflow đơn giản.
- **Senior**: Tổ chức layered architecture + Novu Framework + use case phức tạp.
- **Principal**: Thiết kế subsystem notification độc lập, event-driven, scalable, observable, secure.


