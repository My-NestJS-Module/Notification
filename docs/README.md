# Tài Liệu Tổng Quan – Module NestJS Notification với Novu

Module này là một **library NestJS** trừu tượng hóa việc gửi thông báo đa kênh qua **Novu**, giúp backend chỉ cần làm việc với `NotificationService` và `workflowId` mà không phải quan tâm tới chi tiết provider, engine.

---

## Mục Lục Tài Liệu

- **1. Tổng quan & khi nào dùng**
- **2. Sơ đồ tài liệu chi tiết**
- **3. Quick Start (tích hợp vào project NestJS)**
- **4. Workflows & thư mục `workflows/`**
- **5. Tài liệu tham khảo & nguồn research**

---

## 1. Tổng Quan & Khi Nào Dùng

- **Mục tiêu của module**:
  - **Tách biệt concerns**: Business code không phải gọi trực tiếp Novu API.
  - **Tái sử dụng**: Dùng chung cho nhiều backend khác nhau (multi‑project).
  - **Linh hoạt**: Có thể thay `NotificationProvider` (Novu, custom, v.v.) mà không đổi API bên ngoài.
- **Khi nên dùng**:
  - Bạn có **NestJS backend** và muốn gửi Email / SMS / Push / In‑App qua Novu.
  - Bạn muốn chuẩn hóa cách team tích hợp notification: **chỉ gọi `NotificationService`**, không gọi SDK Novu trực tiếp rải rác.
  - Bạn muốn có **governance, versioning, observability** cho workflows (tham khảo thêm các tài liệu GOV/OBS/MULTI_TENANCY).

Kiến trúc chi tiết, luồng hoạt động, DTO, Webhook, use case… được mô tả trong:

### 1.1. [ARCHITECTURE.md](./ARCHITECTURE.md)

Bao gồm:
- Tổng quan module & Novu.
- Kiến trúc lớp (`NotificationService`, `NotificationProvider`, `NovuProvider`).
- Luồng hoạt động (gửi thông báo, subscriber, webhook, code‑first workflows).
- Cấu trúc dữ liệu DTO / Result.
- Use cases mẫu (order confirmation, OTP, digest, multi‑channel, bulk).
- Hướng dẫn tái sử dụng, mở rộng, testing.

**Đọc đầu tiên** nếu bạn lần đầu dùng module.

### 1.2. [CHANNELS.md](./CHANNELS.md)

- Chi tiết từng kênh:
  - Email Channel (providers, cấu hình).
  - SMS Channel.
  - In‑App.
  - Push Notification (Web/Mobile).
  - Chat (Slack/Discord/Teams).
- Best practices cho từng kênh.

**Đọc khi**: Thiết kế hoặc cấu hình từng kênh cụ thể trong Novu.

### 1.3. [WORKFLOW_PATTERNS.md](./WORKFLOW_PATTERNS.md)

- Tổng quan workflow engine của Novu.
- 7 workflow patterns phổ biến (single channel, digest, fallback chain, A/B testing, rate limiting, conditional branching,…).
- So sánh **Dashboard vs Code‑First**.
- Best practices & testing.

**Đọc khi**: Thiết kế workflows mới hoặc review workflow hiện tại của team.

---

## 2. Sơ Đồ Tài Liệu Chi Tiết

Ngoài các file trên, repo còn có thêm tài liệu chuyên sâu (phase 3, multi‑tenancy, observability, governance…):

- **`docs/Implement_Guide.md`**: Hướng dẫn triển khai chi tiết cho project host.
- **`docs/GOVERNANCE.md`** + `docs/phase-3/governance-versioning/*`:
  - Governance, versioning theo `workflowId`.
  - Client migration playbook khi đổi workflow.
- **`docs/MULTI_TENANCY.md`** + `docs/docs-notification/MULTI_TENANT_INTEGRATION.md`:
  - Cách tích hợp multi‑tenant với Novu & module.
- **`docs/OBSERVABILITY.md`** + `docs/docs-notification/OBSERVABILITY_INTEGRATION.md`:
  - Metrics, logs, tracing, webhook status tracking.
- **`docs/docs-notification/*`**:
  - HOW‑TO tạo/deploy/test workflows, webhook integration, governance usage.
- **`docs/phase-3/*`**:
  - Đề xuất tách core vs provider, kiến trúc package, code‑first workflows, observability checklist.

Khi bắt đầu một **dự án thực tế**, nên:
- Đọc **`ARCHITECTURE.md`** để hiểu module.
- Đọc thêm **`Implement_Guide.md`** + các tài liệu trong `docs/docs-notification/` theo nhu cầu.

---

## 3. Quick Start – Tích Hợp Vào Project NestJS

> Đây là hướng dẫn dành cho **project host** (backend NestJS của bạn) muốn sử dụng module `NotificationModule`.  
> Repo này là library, bạn có thể copy thư mục `src/notification` vào monorepo hoặc đóng gói thành package nội bộ.

### 3.1. Cài Đặt Dependencies Cho Project Host

Trong backend NestJS thực tế:

```bash
npm install @nestjs/common @nestjs/core @nestjs/config @novu/api
```

Nếu bạn dùng code‑first workflows với `@novu/framework`, xem thêm `workflows/README.md` và tài liệu trong `docs/docs-notification/CODE_FIRST_WORKFLOWS.md`.

### 3.2. Cấu Hình Environment Variables

Trong project host:

```env
# Novu Configuration
NOVU_API_KEY=your_novu_api_key
NOVU_SERVER_URL=https://api.novu.co  # Optional, mặc định Novu cloud
# Nếu dùng Inbox / HMAC / multi‑tenant có thể cần thêm:
# NOVU_APP_ID=your_novu_app_id
# NOVU_INBOX_HMAC_SECRET=your_hmac_secret
```

`NotificationConfig` trong `src/notification/config/notification.config.ts` sẽ đọc các biến này (hoặc bạn có thể truyền options vào `NotificationModule.forRoot()`).

### 3.3. Import Module Vào `AppModule`

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NotificationModule.forRoot(), // Có thể truyền options nếu cần custom
  ],
})
export class AppModule {}
```

### 3.4. Gửi Notification Từ Service Domain

```typescript
// order.service.ts
import { Injectable } from '@nestjs/common';
import { NotificationService } from './notification/notification.service';

@Injectable()
export class OrderService {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  async createOrder(orderData: CreateOrderDto) {
    const order = await this.orderRepository.save(orderData);

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

Các API khác có sẵn trong `NotificationService`:
- **`createSubscriber(dto)`**
- **`updateSubscriber(subscriberId, dto)`**
- **`getSubscriberPreferences(subscriberId)`**
- **`updateSubscriberPreferences(subscriberId, preferences)`**
- **`createWorkflow(dto)` / `updateWorkflow(workflowId, dto)` / `deleteWorkflow(workflowId)`** – dùng cho **code‑first workflows** (Workflows v2 API).

Chi tiết DTO xem tại `ARCHITECTURE.md` (mục Luồng Dữ Liệu).

---

## 4. Workflows & Thư Mục `workflows/`

Thư mục `workflows/` trong repo chứa **7 ví dụ code‑first workflows** sử dụng `@novu/framework` + `zod`:

- Mapping trực tiếp với các pattern trong:
  - `docs/WORKFLOW_PATTERNS.md`
  - `docs/phase-3/code-first-workflows/WORKFLOW-PATTERNS-CODE-FIRST.md`
- Không được import trực tiếp vào `NotificationModule` để giữ module core chỉ phụ thuộc `@novu/api`.

Khi áp dụng vào project:
- Cài thêm:

```bash
npm install @novu/framework zod
```

- Copy các file workflow bạn cần từ thư mục `workflows/` sang project host (ví dụ: `src/notification-workflows/`).
- Wire với framework:
  - Next.js: dùng `serve({ workflows })` từ `@novu/framework/next`.
  - NestJS: dùng module bridge hoặc tự wrap `NovuRequestHandler`.
- Trong backend, tiếp tục gọi `NotificationService.sendNotification()` với `workflowId` tương ứng (`order-confirmation`, `critical-alert`, `comment-digest`,…).

Chi tiết xem thêm `workflows/README.md` và tài liệu code‑first trong `docs/docs-notification/`.

---

## 5. Tài Liệu Tham Khảo

### Novu Official Documentation
- **Novu Docs**: https://docs.novu.co
- **Novu API SDK**: https://github.com/novuhq/novu/tree/next/packages/novu
- **Novu Framework**: https://github.com/novuhq/novu/tree/next/packages/framework
- **Novu Quickstart (NestJS)**: https://docs.novu.co/framework/quickstart/nestjs

### NestJS Documentation
- **NestJS Docs**: https://docs.nestjs.com
- **NestJS Modules**: https://docs.nestjs.com/modules
- **NestJS Providers**: https://docs.nestjs.com/providers

### Context7 Documentation
- **Novu Library**: /novuhq/novu
- **Novu Docs Library**: /novuhq/docs

---

## Research Sources

Tài liệu này được tạo dựa trên:

1. **Novu Official Documentation** từ Context7
   - Source: https://github.com/novuhq/novu
   - Source: https://github.com/novuhq/docs

2. **Code Examples** từ các dự án mã nguồn mở
   - GitHub repositories sử dụng Novu với NestJS
   - npm packages: @novu/api, @novu/framework

3. **Web Research**
   - Best practices từ cộng đồng
   - Integration guides
   - Architecture patterns

---

## Cấu Trúc Tài Liệu

```
docs/
├── README.md              # Tài liệu này (tổng quan)
├── ARCHITECTURE.md        # Kiến trúc chi tiết
├── CHANNELS.md            # Chi tiết các kênh thông báo
└── WORKFLOW_PATTERNS.md   # Workflow patterns và best practices
```

---

## Hỗ Trợ

Nếu có câu hỏi hoặc cần hỗ trợ:

1. Đọc tài liệu chi tiết trong các file tương ứng
2. Tham khảo Novu Official Documentation
3. Kiểm tra code examples trong các dự án mã nguồn mở

---

**Ngày tạo**: 2025-01-16  
**Phiên bản**: 1.0.0  
**Cập nhật lần cuối**: 2025-01-16

