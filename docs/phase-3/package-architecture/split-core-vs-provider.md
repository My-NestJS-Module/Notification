## Đề xuất kiến trúc: @company/notification-core vs @company/notification-novu

Mục tiêu của tài liệu này là chi tiết hoá phần **5.2 – Đề xuất tách thành 2 package nội bộ**:
- `@company/notification-core`
- `@company/notification-novu`

### 1. Bài toán

Hiện tại module Notification được dùng như **thư mục copy/paste** giữa các project NestJS.  
Ta muốn:

- Dùng được cho **nhiều dự án backend khác nhau** (đa domain, đa bounded context).
- Có khả năng:
  - Đổi provider (ví dụ từ Novu sang provider khác) trong tương lai.
  - Dễ test (fake provider, in-memory).

### 2. Phân chia trách nhiệm

#### 2.1. @company/notification-core

**Vai trò**: định nghĩa **abstraction** và hợp đồng giữa domain & hệ thống notification.

- **Bao gồm**:
  - DTOs dùng chung:
    - `SendNotificationDto`
    - `CreateSubscriberDto`
    - `UpdateSubscriberDto`
    - `NotificationResult`
    - `SubscriberResult`
    - (Interfaces cho webhook events / notification logs nếu cần dùng chung).
  - Service/Fascade:
    - `NotificationService` – API high-level cho ứng dụng:
      - `sendNotification(...)`
      - `createSubscriber(...)`
      - `updateSubscriber(...)`
      - `getSubscriberPreferences(...)`
  - Provider interface:
    - `NotificationProvider` (interface hoặc abstract class):
      - `trigger(...)`
      - `createSubscriber(...)`
      - `updateSubscriber(...)`
      - `getSubscriberPreferences(...)`
      - `updateSubscriberPreferences(...)`
  - (Option) interface cho webhook/log:
    - `NotificationStatusIRepository`
    - `NotificationLog` interface

- **Không bao gồm**:
  - Code gọi trực tiếp SDK/HTTP của Novu.
  - Bất kỳ dependency nào tới `@novu/api` hay `@novu/framework`.

#### 2.2. @company/notification-novu

**Vai trò**: triển khai `NotificationProvider` bằng **Novu**.

- **Bao gồm**:
  - Implementation:
    - `NovuProvider` – wrap `@novu/api` + `ConfigService`.
  - Wiring module NestJS:
    - `NotificationNovuModule`:
      - Import `ConfigModule` (nếu cần).
      - Provide:
        - `NotificationService` (từ core).
        - `NotificationProvider` = `NovuProvider`.
  - Bất kỳ logic mapping payload/response đặc thù cho Novu.

- **Phụ thuộc**:

```json
{
  "dependencies": {
    "@company/notification-core": "workspace:*",
    "@novu/api": "^3.x",
    "@novu/framework": "^2.x",
    "@nestjs/common": "^11.x",
    "@nestjs/config": "^3.x"
  }
}
```

### 3. Sơ đồ kiến trúc đề xuất

```text
┌────────────────────────────────────────────┐
│           Project Host (Backend App)      │
│  - OrderService, AuthService, ...         │
└───────────────────┬────────────────────────┘
                    │ import
                    ▼
┌────────────────────────────────────────────┐
│      @company/notification-novu            │
│  - NotificationNovuModule                  │
│  - NovuProvider (implements NotificationProvider)
└───────────────────┬────────────────────────┘
                    │ depends on
                    ▼
┌────────────────────────────────────────────┐
│      @company/notification-core            │
│  - NotificationService (Facade)           │
│  - DTOs, Interfaces, Provider interface   │
└───────────────────┬────────────────────────┘
                    │ uses
                    ▼
┌────────────────────────────────────────────┐
│                 Novu API/SDK              │
└────────────────────────────────────────────┘
```

### 4. Cách sử dụng từ project host

Trong project NestJS sử dụng module:

```ts
// app.module.ts (project host)
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationNovuModule } from '@company/notification-novu';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NotificationNovuModule.forRoot(), // hoặc forRootAsync(...) nếu cần
  ],
})
export class AppModule {}
```

Domain code không cần biết provider phía sau:

```ts
// order.service.ts
import { NotificationService } from '@company/notification-core';
import { NotificationWorkflows } from '../config/notification-workflows.config';

await this.notificationService.sendNotification({
  to: {
    subscriberId: order.userId,
    email: order.userEmail,
  },
  workflowId: NotificationWorkflows.ORDER_CONFIRMATION_V2,
  payload: {
    // ...
  },
});
```

### 5. Lợi ích chính

- **Reuse đa project**:
  - Mọi project backend chỉ cần:
    - `@company/notification-core` + `@company/notification-novu`.
  - Cấu trúc code nhất quán, dễ onboard team mới.

- **Thay provider dễ dàng**:
  - Có thể giới thiệu `@company/notification-other-provider` (ví dụ: custom provider nội bộ).
  - Project host chỉ việc đổi import module / DI token.

- **Testing tốt hơn**:
  - Trong test:
    - Có thể cung cấp fake `NotificationProvider` implement interface từ core.
    - Không phải mock trực tiếp SDK Novu ở mọi nơi.

- **Giới hạn coupling**:
  - Code business nói chuyện với NotificationService/DTO (core), không dính Novu-specific type.

### 6. Trạng thái hiện tại & bước tiếp theo

- Trạng thái hiện tại:
  - Trong repo này, module vẫn ở dạng **một package đơn** (thư mục `src/notification`).
  - Tài liệu kiến trúc (`docs/ARCHITECTURE.md`) đã mô tả pattern Facade + Provider.
- Bước tiếp theo (ngoài phạm vi tài liệu Phase 3):
  - Nếu chuyển sang monorepo (Nx, pnpm workspace,…), tách thực tế thành:
    - `packages/notification-core`
    - `packages/notification-novu`
  - Cập nhật import path trong code & docs.


