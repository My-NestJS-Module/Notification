## Tổng quan

**Mục tiêu của bộ tài liệu này**:
- Thiết kế kiến trúc & workflow chuẩn để **gửi Email & SMS** từ **NestJS backend** qua **Novu**.
- Bao phủ cả:
  - **Novu Cloud** (gọi qua REST API / SDK `@novu/api`).
  - **Novu Framework** (code-first workflows chạy cạnh NestJS).
- Cung cấp nội dung theo **4 cấp độ**:
  - **Junior**: Hiểu luồng cơ bản và biết dùng service gửi thông báo.
  - **Middle**: Biết thiết kế module, DTO, workflow chuẩn.
  - **Senior**: Thiết kế layered architecture, use case phức tạp, kết hợp Novu Framework.
  - **Principal**: Thiết kế hệ thống notification như một subsystem độc lập, event-driven, scalable.

## Cấu trúc tài liệu

- **`ARCHITECTURE.md`**:
  - Tổng quan kiến trúc, cấu trúc thư mục, dependencies, env vars.
  - Luồng hoạt động & luồng dữ liệu (DTO, payload).
  - 5+ use case thực tế.
  - Code mẫu NestJS + Novu (Email & SMS).
- **`Implement_Guide.md`**:
  - Hướng dẫn **tái sử dụng** và **mở rộng**:
    - Abstraction `INotificationGateway`.
    - Use cases tách riêng.
    - Kết hợp Novu Framework.
- **`WORKFLOW_PATTERNS.md`**:
  - Các **workflow patterns** phổ biến & nâng cao:
    - One-shot, multi-channel, OTP, digest, multi-step, policy-driven, event-driven.
  - Best practices cho từng cấp độ (Junior → Principal).
- **`RESEARCH_SUMMARY.md`**:
  - Tổng hợp **nguồn research** (Novu official docs, NestJS docs, internet, open source).
  - Kết luận chính & kiến trúc đề xuất.
- (Thư mục này còn có thể mở rộng thêm các ví dụ code, diagram, v.v.)

## Quick Start – Tích hợp tối thiểu (Novu Cloud + NestJS)

### 1. Cài đặt dependencies

```bash
npm install @nestjs/common @nestjs/core @nestjs/config
npm install axios
```

Nếu muốn dùng SDK chính thức:

```bash
npm install @novu/api
```

### 2. Cấu hình biến môi trường

Tạo file `.env`:

```bash
NOVU_API_KEY=your_novu_api_key_here
NOVU_API_URL=https://api.novu.co
```

Đảm bảo `ConfigModule.forRoot()` đã được bật trong `AppModule`.

### 3. Tạo NotificationsModule đơn giản

```typescript
// notifications/notifications.module.ts
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

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NotificationsModule,
  ],
})
export class AppModule {}
```

### 4. Service gọi Novu API để gửi Email & SMS

```typescript
// notifications/notifications.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface SendNotificationOptions {
  templateName: string;
  email?: string;
  phone?: string;
  payload: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('NOVU_API_KEY');
    this.apiUrl =
      this.configService.get<string>('NOVU_API_URL') ?? 'https://api.novu.co';
  }

  async send(options: SendNotificationOptions) {
    const body = {
      name: options.templateName,
      to: {
        subscriberId:
          options.payload.userId ?? options.email ?? options.phone,
        email: options.email,
        phone: options.phone,
      },
      payload: options.payload,
    };

    const res = await axios.post(
      `${this.apiUrl}/v1/events/trigger`,
      body,
      {
        headers: {
          Authorization: `ApiKey ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      },
    );

    return res.data;
  }
}
```

### 5. Controller demo

```typescript
// notifications/notifications.controller.ts
import { Body, Controller, Post } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
  ) {}

  @Post('welcome')
  async sendWelcome(@Body() body: { email?: string; phone?: string; name: string }) {
    return this.notificationsService.send({
      templateName: 'user-welcome',
      email: body.email,
      phone: body.phone,
      payload: {
        userId: body.email ?? body.phone,
        name: body.name,
      },
    });
  }
}
```

### 6. Tạo workflow & template trên Novu

- Trên Novu dashboard:
  - Tạo workflow `user-welcome`.
  - Thêm:
    - Step Email (template chào mừng).
    - Step SMS (tùy chọn) với nội dung ngắn.
  - Map các biến trong template với `payload` (ví dụ `{{name}}`).

Khi gọi `POST /notifications/welcome`, nếu mọi thứ được cấu hình đúng, user sẽ nhận **Email, SMS, hoặc cả hai** tùy theo cấu hình workflow.

---

## Tiếp theo nên đọc gì?

- **Mức Junior**:
  - Đọc kỹ `ARCHITECTURE.md` phần Junior + Middle.
  - Chạy thử endpoint demo để hiểu luồng.
- **Mức Middle**:
  - `Implement_Guide.md` để biết cách trừu tượng hóa `INotificationGateway`.
  - `WORKFLOW_PATTERNS.md` để nắm các pattern phổ biến.
- **Mức Senior/Principal**:
  - `ARCHITECTURE.md` phần Senior/Principal.
  - `WORKFLOW_PATTERNS.md` phần advanced patterns.
  - `RESEARCH_SUMMARY.md` để xem rationale & quyết định kiến trúc.


