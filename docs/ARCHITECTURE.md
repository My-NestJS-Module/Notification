# Tài Liệu Kiến Trúc: Module NestJS Notification với Novu

## Mục Lục

1. [Hướng Dẫn Theo Cấp Độ](#hướng-dẫn-theo-cấp-độ)
2. [Tổng Quan](#tổng-quan)
3. [Kiến Trúc Module](#kiến-trúc-module)
4. [Các Phụ Thuộc](#các-phụ-thuộc)
5. [Luồng Hoạt Động](#luồng-hoạt-động)
6. [Luồng Dữ Liệu](#luồng-dữ-liệu)
7. [Use Cases](#use-cases)
8. [Chi Tiết Implementation](#chi-tiết-implementation)
9. [Tái Sử Dụng và Mở Rộng](#tái-sử-dụng-và-mở-rộng)

---

## Hướng Dẫn Theo Cấp Độ

> **Mục tiêu**: cùng một tài liệu nhưng mỗi cấp độ sẽ tập trung vào phần phù hợp, không bị “ngợp” hoặc thiếu chiều sâu.

### Junior

- **Nên đọc kỹ**:
  - `Tổng Quan` – hiểu module này giải quyết vấn đề gì.
  - `Luồng Hoạt Động` – nắm high-level flow: backend → NotificationService → Novu.
  - `Luồng Dữ Liệu` – hiểu các DTO vào/ra cơ bản (`SendNotificationDto`, `NotificationResult`,...).
- **Kỹ năng đạt được**:
  - Biết **gọi `NotificationService.sendNotification()`** từ service/domain hiện tại.
  - Biết cấu hình **env cơ bản**: `NOVU_API_KEY`, `NOVU_SERVER_URL`, `NOVU_APP_ID`.

### Middle

- **Nên tập trung thêm**:
  - `Kiến Trúc Module` – hiểu cấu trúc thư mục, các lớp và interface chính.
  - `Use Cases` – cách áp dụng module cho Email, SMS, In‑App, Bulk,...
  - Phần đầu của `Chi Tiết Implementation` – cách module + provider được wiring bằng NestJS DI.
- **Kỹ năng đạt được**:
  - Tự **tích hợp module vào project NestJS mới**.
  - Tự định nghĩa **workflowId + payload** phù hợp business của team.
  - Debug được lỗi tích hợp cơ bản (sai env, sai workflowId, sai DTO).

### Senior

- **Nên đi sâu**:
  - `Design Patterns Sử Dụng` trong `Kiến Trúc Module`.
  - `Luồng Dữ Liệu` + mapping sang Novu API (hiểu cách payload bị transform).
  - `Tái Sử Dụng và Mở Rộng` – custom provider, decorators, interceptor, testing strategy.
- **Kỹ năng đạt được**:
  - **Review thiết kế** module, phát hiện risk (tight coupling, error handling, retry, idempotency).
  - Thiết kế **event‑driven integration** (OrderCreated → Notification) mà không nhét logic vào module.
  - Viết test (unit/integration) cho flow có Novu nhưng vẫn kiểm soát được behaviour.

### Principal

- **Góc nhìn hệ thống / multi‑project**:
  - Đánh giá **module này như một “platform component”** dùng lại cho nhiều sản phẩm.
  - Kiểm tra **biên giới kiến trúc**: module này thuộc bounded context nào (Notification, Communication Platform,...).
  - Suy nghĩ về **multi‑tenant, multi‑region**, bảo mật (HMAC, secret management), observability (metrics/log/tracing).
- **Nội dung nên chú ý**:
  - Toàn bộ `Kiến Trúc Module` + `Tái Sử Dụng và Mở Rộng`.
  - Cách `NotificationModule.forRoot(...)` có thể nhận config để dùng chung **trên nhiều repo**.
  - Chỗ nào có thể trích ra thành **internal package** (npm private / monorepo lib).

---

## Tổng Quan

Module NestJS Notification với Novu được thiết kế để cung cấp một giải pháp thống nhất cho việc gửi và nhận thông báo đa kênh (SMS, Email, Web Push, Mobile Push, In-app) trong các ứng dụng NestJS. Module này được xây dựng với mục tiêu:

- **Tái sử dụng cao**: Có thể tích hợp vào nhiều dự án khác nhau mà không phụ thuộc vào logic nghiệp vụ cụ thể
- **Linh hoạt**: Hỗ trợ nhiều kênh thông báo và có thể mở rộng dễ dàng
- **Dễ sử dụng**: Cung cấp API đơn giản và rõ ràng cho các dự án sử dụng
- **Tách biệt concerns**: Tách biệt hoàn toàn logic thông báo khỏi business logic

### Novu là gì?

Novu là một nền tảng thông báo mã nguồn mở cung cấp:
- **Multi-channel delivery**: Hỗ trợ In-App, Push, Email, SMS, và Chat
- **Workflow engine**: Cho phép tạo các workflow phức tạp với delay, digest, conditions
- **Subscriber management**: Quản lý người đăng ký và preferences
- **Provider abstraction**: Hỗ trợ nhiều provider cho mỗi kênh (SendGrid, Twilio, AWS SNS, v.v.)

---

## Kiến Trúc Module

### 2.1. Cấu Trúc Thư Mục

```
notification-module/
├── src/
│   ├── notification.module.ts          # Module chính
│   ├── notification.service.ts         # Service chính xử lý thông báo
│   ├── providers/
│   │   ├── novu.provider.ts            # Provider tích hợp với Novu SDK
│   │   └── notification.provider.interface.ts  # Interface cho provider
│   ├── interfaces/
│   │   ├── notification.interface.ts   # Interface cho notification
│   │   ├── subscriber.interface.ts    # Interface cho subscriber
│   │   └── workflow.interface.ts       # Interface cho workflow
│   ├── dto/
│   │   ├── send-notification.dto.ts    # DTO cho việc gửi thông báo
│   │   ├── create-subscriber.dto.ts    # DTO cho tạo subscriber
│   │   └── update-subscriber.dto.ts     # DTO cho cập nhật subscriber
│   ├── decorators/
│   │   └── notification.decorator.ts    # Decorators cho metadata
│   ├── config/
│   │   └── notification.config.ts       # Configuration module
│   └── types/
│       └── notification.types.ts        # Type definitions
├── test/
│   ├── unit/
│   └── integration/
└── docs/
    └── ARCHITECTURE.md
```

### 2.2. Kiến Trúc Lớp (Layer Architecture)

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                    │
│  (Business Logic - Không phụ thuộc vào notification)    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ Uses
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Notification Module Layer                  │
│  ┌──────────────────────────────────────────────────┐  │
│  │         NotificationService (Facade)              │  │
│  │  - sendNotification()                            │  │
│  │  - createSubscriber()                            │  │
│  │  - updateSubscriber()                            │  │
│  │  - getSubscriberPreferences()                    │  │
│  └──────────────┬───────────────────────────────────┘  │
│                 │                                       │
│  ┌──────────────▼───────────────────────────────────┐  │
│  │         NotificationProvider (Interface)         │  │
│  │  - trigger()                                     │  │
│  │  - createSubscriber()                            │  │
│  │  - updateSubscriber()                            │  │
│  └──────────────┬───────────────────────────────────┘  │
└─────────────────┼──────────────────────────────────────┘
                  │
                  │ Implements
                  ▼
┌─────────────────────────────────────────────────────────┐
│                  Novu Provider Layer                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │              NovuProvider (Implementation)        │  │
│  │  - Wraps @novu/api SDK                            │  │
│  │  - Handles API calls                              │  │
│  │  - Error handling & retry logic                   │  │
│  └──────────────┬───────────────────────────────────┘  │
└─────────────────┼──────────────────────────────────────┘
                  │
                  │ Uses
                  ▼
┌─────────────────────────────────────────────────────────┐
│                    Novu API Layer                        │
│              (@novu/api SDK)                             │
│  - REST API calls to Novu Cloud/Self-hosted              │
│  - Workflow execution                                    │
│  - Subscriber management                                 │
└─────────────────────────────────────────────────────────┘
```

### 2.3. Design Patterns Sử Dụng

1. **Facade Pattern**: `NotificationService` đóng vai trò facade, cung cấp API đơn giản cho application layer
2. **Provider Pattern**: `NotificationProvider` interface cho phép thay thế implementation (Novu, custom, v.v.)
3. **Strategy Pattern**: Mỗi kênh thông báo có thể có strategy riêng
4. **Factory Pattern**: Tạo các notification instances dựa trên type
5. **Dependency Injection**: Sử dụng NestJS DI container

---

## Governance & Versioning (Phase 3)

> Mục này tóm tắt cách module Notification vận hành trong bối cảnh **governance & versioning**. Chi tiết đầy đủ xem thêm trong `docs/GOVERNANCE.md` và thư mục `docs/phase-3/`.

### 2.x.1. Vai trò của module trong governance

- Module:
  - Chỉ nhận `workflowId: string` từ project host.
  - Không tự quyết định versioning (v1/v2).
  - Cung cấp abstraction ổn định: DTOs, `NotificationService`, `NotificationProvider` interface.
- Governance & versioning:
  - Được áp dụng ở **project host** (backend tích hợp module):
    - Dùng config/mapping `NotificationWorkflows` để chọn workflowId.
    - Sử dụng feature flags hoặc env config để rollout version mới.
    - Áp dụng PR template & checklist khi thay đổi workflow (xem `docs/docs-notification/GOVERNANCE_USAGE.md`).

### 2.x.2. Versioning bằng workflowId

- Convention:
  - `order-confirmation` → `order-confirmation-v2` → `order-confirmation-v3`.
- Khi có breaking change (thay đổi payload bắt buộc, đổi kiểu/đổi tên field, thay đổi channel quan trọng):
  - Tạo workflow mới `*-v2` trên Novu (code-first hoặc Dashboard).
  - Cập nhật project host:
    - Thêm mapping:
      - `ORDER_CONFIRMATION_V1: 'order-confirmation'`
      - `ORDER_CONFIRMATION_V2: 'order-confirmation-v2'`
    - Chọn version qua feature flag/config.
  - Vận hành song song v1/v2 trong **grace period** trước khi sunset v1.

Chi tiết:

- `docs/GOVERNANCE.md` – mục Versioning workflows.  
- `docs/phase-3/governance-versioning/versioning-strategy.md`  
- `docs/phase-3/governance-versioning/client-migration-playbook.md`  

### 2.x.3. Định hướng tách core vs provider-specific

- Mục tiêu:
  - Dài hạn, module được tách thành 2 package nội bộ:
    - `@company/notification-core`: abstraction, DTOs, `NotificationService`, provider interface.
    - `@company/notification-novu`: implementation provider dùng Novu (`NovuProvider`, wiring với `@novu/api`).
- Lợi ích:
  - Dễ reuse trên nhiều project backend khác nhau.
  - Dễ thay provider tương lai mà không chạm vào domain code.

Chi tiết kiến trúc đề xuất:

- `docs/phase-3/package-architecture/split-core-vs-provider.md`  
- Bản nháp tích hợp vào kiến trúc: `docs/phase-3/architecture-updates/governance-section-draft.md`  

---

## Các Phụ Thuộc

### 3.1. Dependencies Chính

```json
{
  "dependencies": {
    "@nestjs/common": "^11.0.0",
    "@nestjs/core": "^11.0.0",
    "@nestjs/config": "^3.0.0",
    "@novu/api": "^3.11.0",
    "@novu/framework": "^2.8.0",
    "rxjs": "^7.8.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@nestjs/testing": "^11.0.0",
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0"
  }
}
```

### 3.2. Giải Thích Dependencies

- **@nestjs/common & @nestjs/core**: Framework NestJS cốt lõi
- **@nestjs/config**: Quản lý configuration từ environment variables
- **@novu/api**: SDK chính thức của Novu để tương tác với Novu API
- **@novu/framework**: Framework SDK của Novu cho code-first workflows (optional, nếu sử dụng framework approach)
- **rxjs**: Reactive programming (NestJS sử dụng RxJS)
- **zod**: Schema validation cho payload và configuration

### 3.3. Environment Variables Cần Thiết

```env
# Novu Configuration
NOVU_API_KEY=your_novu_api_key
NOVU_APP_ID=your_novu_app_id
NOVU_SERVER_URL=https://api.novu.co  # Optional, mặc định là api.novu.co

# Optional: Region-specific endpoint
# NOVU_SERVER_URL=https://eu.api.novu.co  # For EU region
```

#### 3.3.1. Cơ chế kiểm tra env (Fail Fast)

Module cần tự kiểm tra ngay khi khởi tạo:

1. **Trong `NotificationModule.forRoot()`** hoặc provider config, đọc env bằng `ConfigService` (hoặc options truyền vào).
2. Bắt buộc phải có:
   - `NOVU_API_KEY`
3. Nếu module dùng Inbox hoặc webhook HMAC thì có thể yêu cầu thêm:
   - `NOVU_APP_ID`
   - `NOVU_INBOX_HMAC_SECRET` (nếu bật HMAC)
4. Nếu thiếu, **throw Error** ngay lúc bootstrap (fail fast) để backend biết cấu hình chưa đúng.

Pseudo:

```ts
const apiKey = configService.get<string>('NOVU_API_KEY');
if (!apiKey) {
  throw new Error('[NotificationModule] NOVU_API_KEY is missing. Please set it in environment variables.');
}
```

=> Phần này giúp backend chính không chạy với cấu hình thiếu và phát hiện lỗi ngay lúc start.

### 3.4. Novu Setup Requirements

1. **Tạo Novu Account**: Đăng ký tại https://novu.co
2. **Lấy API Key**: Từ Novu Dashboard → Settings → API Keys
3. **Tạo Workflows**: Tạo các notification workflows trong Novu Dashboard hoặc sử dụng code-first với @novu/framework
4. **Cấu hình Providers**: Thiết lập providers cho từng kênh (SendGrid cho Email, Twilio cho SMS, v.v.)

---

## Luồng Hoạt Động

### 4.1. Luồng Gửi Thông Báo (Send Notification Flow)

```
┌──────────────┐
│  Application │
│    Layer     │
└──────┬───────┘
       │
       │ 1. sendNotification(dto)
       ▼
┌─────────────────────────┐
│  NotificationService    │
│  - Validate input        │
│  - Transform data        │
│  - Determine workflow    │
└──────┬──────────────────┘
       │
       │ 2. provider.trigger()
       ▼
┌─────────────────────────┐
│  NovuProvider           │
│  - Build Novu payload   │
│  - Call Novu API        │
│  - Handle errors        │
└──────┬──────────────────┘
       │
       │ 3. HTTP Request
       ▼
┌─────────────────────────┐
│  Novu API               │
│  - Process workflow     │
│  - Route to channels    │
│  - Send notifications   │
└──────┬──────────────────┘
       │
       │ 4. Response
       ▼
┌─────────────────────────┐
│  NotificationService    │
│  - Transform response    │
│  - Return result        │
└──────┬──────────────────┘
       │
       │ 5. Return result
       ▼
┌──────────────┐
│  Application │
│    Layer     │
└──────────────┘
```

### 4.2. Luồng Tạo Subscriber (Create Subscriber Flow)

```
Application Layer
       │
       │ createSubscriber(dto)
       ▼
NotificationService
       │
       │ - Validate subscriber data
       │ - Check if subscriber exists
       │
       ▼
NovuProvider
       │
       │ - Call novu.subscribers.create()
       │
       ▼
Novu API
       │
       │ - Create subscriber record
       │ - Set default preferences
       │
       ▼
Response → NotificationService → Application Layer
```

### 4.3. Luồng Xử Lý Workflow (Workflow Execution Flow)

```
1. Application triggers notification
   ↓
2. NotificationService receives request
   ↓
3. Service determines workflow ID based on:
   - Notification type
   - Business context
   - User preferences
   ↓
4. NovuProvider calls novu.trigger() with:
   - workflowId
   - subscriber information
   - payload data
   ↓
5. Novu API processes workflow:
   a. Evaluate workflow steps
   b. Check subscriber preferences
   c. Apply conditions (if any)
   d. Execute steps sequentially:
      - In-App notification
      - Delay (if configured)
      - Email
      - SMS
      - Push notification
   ↓
6. Novu sends notifications via configured providers
   ↓
7. Response returned to application
```

### 4.4. Luồng Quản Lý Preferences (Preferences Management Flow)

```
Application Layer
       │
       │ updateSubscriberPreferences(subscriberId, preferences)
       ▼
NotificationService
       │
       │ - Validate preferences
       │ - Transform to Novu format
       │
       ▼
NovuProvider
       │
       │ - Call novu.subscribers.preferences.update()
       │
       ▼
Novu API
       │
       │ - Update subscriber preferences
       │ - Apply to workflows
       │
       ▼
Response → NotificationService → Application Layer
```

### 4.5. Luồng Webhook Trạng Thái Từ Novu Về Backend

> **Mục tiêu**: backend biết được **trạng thái thực tế** của thông báo (delivered, opened, bounced, clicked, v.v.) để log, analytics, hoặc trigger logic tiếp theo.

Ở mức high‑level:

```
Providers (SendGrid/Twilio/...) 
   │  (provider event: delivered/opened/bounced/...)
   ▼
Novu (Inbound Webhooks từ provider, normalize status)
   │
   │  (Outbound Webhook - normalized event)
   ▼
Backend Webhook Endpoint (NestJS Controller)
   │
   │  (map sang domain model / DB / metrics / events)
   ▼
Analytics / Audit / Domain Events
```

#### 4.5.1. Kiến trúc tích hợp

- **Novu**:
  - Nhận event từ provider qua **inbound webhook** (SendGrid, Mailgun, v.v.).
  - Chuẩn hóa về một tập status chung (ví dụ: `SENT`, `DELIVERED`, `BOUNCED`, `OPENED`, `CLICKED`...).
  - (Tuỳ config) Gửi **outbound webhooks** tới backend của bạn với payload thống nhất.

- **Backend**:
  - Expose một endpoint (ví dụ: `POST /internal/webhooks/novu`).
  - Xác thực request (secret/signature nếu được cấu hình).
  - Map payload Novu → domain model (NotificationStatus, MessageLog,...).
  - Optionally publish tiếp domain events (`NotificationDelivered`, `NotificationBounced`,...).

#### 4.5.2. Cấu trúc DTO Webhook

Module core đã cung cấp interface `NovuWebhookEvent` tại `src/notification/interfaces/novu-webhook-event.interface.ts`:

```typescript
interface NovuWebhookEvent {
  id: string;                       // ID của event trong Novu
  type: string;                     // Loại event: message_delivered, message_bounced, message_opened, message_clicked,...
  timestamp: string;                // ISO datetime

  workflowId?: string;              // Workflow liên quan
  stepId?: string;                  // Step trong workflow (email/sms/push/in_app)
  channel?: 'email' | 'sms' | 'push' | 'in_app' | 'chat';

  status?: string;                  // Trạng thái chuẩn hóa (DELIVERED/BOUNCED/OPENED/CLICKED/...)

  subscriberId?: string;            // subscriberId mà bạn đã gửi ở lúc trigger
  messageId?: string;               // ID message ở provider (nếu có)

  provider?: {
    id: string;                     // sendgrid, mailgun, twilio, fcm,...
    raw?: Record<string, any>;      // payload raw từ provider (nếu Novu forward)
  };

  metadata?: Record<string, any>;   // Bất kỳ metadata nào bạn đính kèm (transactionId, correlationId,...)
}
```

**Lưu ý**: Module core chỉ cung cấp interface này, không tự tạo controller để tránh coupling với routing/security của từng dự án. Project host cần tự tạo controller dựa trên mẫu trong `docs/examples/novu-webhook.controller.example.ts`.

#### 4.5.3. Domain Model và Repository Interface

Module core cung cấp các interface để project host implement:

1. **NotificationLog Interface** (`src/notification/interfaces/notification-log.interface.ts`):
   - Định nghĩa cấu trúc entity cho bảng `notification_logs`
   - Bao gồm các trường: `externalId`, `workflowId`, `stepId`, `channel`, `status`, `subscriberId`, `providerId`, `messageId`, `occurredAt`, `metadata`, `raw`, v.v.

2. **NotificationStatusIRepository Interface** (`src/notification/interfaces/notification-status-i-repository.interface.ts`):
   - Interface tối thiểu cho repository để lưu và query notification logs
   - Methods: `save()`, `findByExternalId()`, `findBySubscriberId()`, `findByWorkflowId()`, `findByStatus()`
   - Project host implement với ORM của họ (TypeORM, Prisma, Mongoose, v.v.)

**Schema gợi ý cho bảng `notification_logs`**:
- `id` (PK)
- `externalId` (unique, để đảm bảo idempotency)
- `workflowId`, `stepId`, `channel`, `status`
- `subscriberId`, `providerId`, `messageId`
- `occurredAt` (datetime)
- `metadata` (JSONB)
- `raw` (JSONB, optional)
- `createdAt`, `updatedAt`
- Indexes: `externalId` (unique), `subscriberId`, `workflowId`, `status`, `occurredAt`

Xem mẫu entity/migration trong `docs/examples/notification-log.entity.example.ts`.

#### 4.5.4. Mẫu Controller và Service

Module core **không tự tạo controller** để tránh coupling với routing/security của từng dự án. Project host cần:

1. **Tạo Controller** dựa trên mẫu trong `docs/examples/novu-webhook.controller.example.ts`:
   - Endpoint: `POST /internal/webhooks/novu` (hoặc path tùy chỉnh)
   - Xử lý single event hoặc array of events
   - (Optional) Verify webhook signature với Svix
   - Gọi `NotificationStatusService.handle()`

2. **Tạo Service** dựa trên mẫu trong `docs/examples/notification-status.service.example.ts`:
   - Map `NovuWebhookEvent` → `CreateNotificationLogDto`
   - Check idempotency (dựa trên `externalId`)
   - Lưu vào database qua `NotificationStatusIRepository`
   - (Optional) Phát domain events (`NotificationDelivered`, `NotificationBounced`, v.v.)

Xem chi tiết trong `docs/docs-notification/WEBHOOK_INTEGRATION.md`.

#### 4.5.5. Best Practices

1. **Idempotency**: Sử dụng `externalId` (event.id) làm unique key để tránh xử lý trùng lặp
2. **Security**: Verify webhook signature với Svix nếu cấu hình secret trong Novu Dashboard
3. **Performance**: Trả `200 OK` càng sớm càng tốt, xử lý async nếu cần
4. **Error Handling**: Log lỗi nhưng không throw để tránh Novu retry không cần thiết
5. **Domain Events**: Phát domain events cho các bounded context khác (analytics, audit, v.v.)

#### 4.5.6. Gợi ý cho từng cấp độ

- **Junior**: chưa cần chạm vào webhook, chỉ cần biết "Novu có thể gửi ngược về backend để theo dõi trạng thái".  
- **Middle**: có thể implement `NovuWebhookController` + `NotificationStatusService` đơn giản, lưu log để team QA/CS xem.  
- **Senior**: thiết kế schema DB cho notification log, mapping status, domain events, retry khi webhook fail.  
- **Principal**: xem webhook này như **nguồn truth về engagement** (opened/clicked), kết nối với BI/analytics, định nghĩa SLO về delivery, và policy xử lý bounce/spam.

### 4.6. Luồng Quản Lý Workflow Theo Hướng Code-First (Tạo/Sửa/Xoá Workflow Trên Novu)

> **Mục tiêu**: Cho phép backend **đăng ký và cập nhật workflows trên Novu qua API** (code‑first), thay vì chỉ tạo bằng tay trên Dashboard.

Ở high‑level:

```
Root Backend Controller (Admin / Internal API)
    │  (POST/PUT/DELETE /internal/notifications/workflows)
    ▼
NotificationService (Module)
    │  (createWorkflow/updateWorkflow/deleteWorkflow)
    ▼
NovuProvider
    │  (call Novu /v2/workflows APIs)
    ▼
Novu API (Workflows v2)
```

#### 4.6.1. Các actor tham gia

- **Backend chính (root app)**:
  - Expose các endpoint nội bộ cho admin / DevOps / CI pipeline:
    - `POST /internal/notifications/workflows`
    - `PUT /internal/notifications/workflows/:workflowId`
    - `DELETE /internal/notifications/workflows/:workflowId`
  - Gửi **“workflow definition DTO”** vào module.

- **NotificationModule**:
  - Cung cấp các method trong service:
    - `createWorkflow(dto)`
    - `updateWorkflow(workflowId, dto)`
    - `deleteWorkflow(workflowId)`
  - Gọi sang `NovuProvider` để thực thi với Novu.

- **NovuProvider**:
  - Wrap các REST API:
    - `POST /v2/workflows`
    - `PUT /v2/workflows/{workflowId}`
    - `DELETE /v2/workflows/{workflowId}`

#### 4.6.2. Dòng chảy tạo workflow (Create Workflow Flow)

```
1. Admin/CI gọi backend:
   POST /internal/notifications/workflows
   Body: CreateWorkflowDto (code‑first)
   ↓
2. Root Controller nhận request, validate DTO
   ↓
3. Gọi NotificationService.createWorkflow(dto)
   ↓
4. NotificationService map DTO nội bộ → payload Novu
   ↓
5. NovuProvider gọi Novu:
   POST /v2/workflows với body:
     - workflowId, name, description, tags
     - steps[]: type (email/sms/in_app/push/chat), controlValues (body/subject/...)
   ↓
6. Novu tạo workflow, trả về workflow object
   ↓
7. NotificationService trả kết quả (workflowId, name, active, createdAt, ...)
   ↓
8. Root Controller trả JSON cho client/admin/CI
```

Quy trình update/delete tương tự, chỉ thay HTTP method + endpoint.

---

## Luồng Dữ Liệu

### 5.1. Input Data Structure

#### 5.1.1. Send Notification DTO

```typescript
interface SendNotificationDto {
  // Subscriber information
  to: {
    subscriberId: string;        // Required: Unique identifier
    email?: string;              // Optional: Email address
    phone?: string;              // Optional: Phone number (E.164 format)
    firstName?: string;          // Optional: First name
    lastName?: string;           // Optional: Last name
    avatar?: string;             // Optional: Avatar URL
    locale?: string;             // Optional: Locale (e.g., 'en', 'vi')
    timezone?: string;           // Optional: Timezone (e.g., 'Asia/Ho_Chi_Minh')
    data?: Record<string, any>;  // Optional: Custom subscriber data
  };
  
  // Workflow identification
  workflowId: string;            // Required: Workflow identifier from Novu
  
  // Payload data (used in workflow templates)
  payload: Record<string, any>;  // Required: Data for template variables
  
  // Overrides (optional channel-specific overrides)
  overrides?: {
    email?: {
      from?: string;
      replyTo?: string;
      bcc?: string[];
      cc?: string[];
      subject?: string;
    };
    sms?: {
      from?: string;
    };
    push?: {
      title?: string;
      sound?: string;
    };
    inApp?: {
      title?: string;
      body?: string;
    };
  };
  
  // Transaction tracking
  transactionId?: string;         // Optional: Unique transaction ID
}
```

#### 5.1.2. Create Subscriber DTO

```typescript
interface CreateSubscriberDto {
  subscriberId: string;          // Required: Unique identifier
  email?: string;                // Optional
  phone?: string;                // Optional
  firstName?: string;            // Optional
  lastName?: string;             // Optional
  avatar?: string;               // Optional
  locale?: string;               // Optional
  timezone?: string;             // Optional
  data?: Record<string, any>;    // Optional: Custom data
}
```

#### 5.1.3. Update Subscriber DTO

```typescript
interface UpdateSubscriberDto {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  locale?: string;
  timezone?: string;
  data?: Record<string, any>;
}
```

#### 5.1.4. Create/Update Workflow DTO (Code-First)

Đây là DTO nội bộ mà backend chính sẽ gửi vào module để tạo/sửa workflow trên Novu. Module sẽ map DTO này sang payload `POST/PUT /v2/workflows` của Novu.

```typescript
type WorkflowChannelType = 'email' | 'sms' | 'in_app' | 'push' | 'chat';

interface WorkflowStepControlValues {
  // Một số field dùng chung, tuỳ type sẽ sử dụng subset phù hợp
  subject?: string;            // Email subject
  body: string;                // Nội dung chính (bắt buộc cho hầu hết channel)
  title?: string;              // In-app / Push title
  preheader?: string;          // Email preheader
  icon?: string;               // In-app icon
}

interface WorkflowStepDefinitionDto {
  name: string;                // Tên step, ví dụ: "in-app-notification", "confirmation-email"
  type: WorkflowChannelType;   // 'email' | 'sms' | 'in_app' | 'push' | 'chat'
  controlValues: WorkflowStepControlValues;
}

export interface CreateWorkflowDto {
  workflowId: string;          // ID duy nhất, dùng khi trigger (code-first)
  name: string;                // Tên hiển thị
  description?: string;
  tags?: string[];
  steps: WorkflowStepDefinitionDto[];
}

export type UpdateWorkflowDto = Partial<Omit<CreateWorkflowDto, 'workflowId'>> & {
  // workflowId sẽ nằm ở path param
};
```

Khi map sang Novu:

- `workflowId` → `workflowId` (Novu v2).
- `name`, `description`, `tags` → mapping 1:1.
- `steps[]` → array `steps` trong body `POST/PUT /v2/workflows`.

### 5.2. Output Data Structure

#### 5.2.1. Notification Result

```typescript
interface NotificationResult {
  acknowledged: boolean;          // Whether the event was acknowledged
  status: 'processed' | 'error';  // Processing status
  transactionId?: string;        // Transaction ID
  error?: {
    message: string;
    code?: string;
  };
}
```

#### 5.2.2. Subscriber Result

```typescript
interface SubscriberResult {
  subscriberId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  locale?: string;
  timezone?: string;
  data?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}
```

#### 5.2.3. Workflow Result (Trả Về Sau Khi Tạo/Sửa Workflow)

```typescript
interface WorkflowResult {
  id: string;                 // _id nội bộ của Novu (nếu cần)
  workflowId: string;         // ID mà backend dùng để trigger
  name: string;
  description?: string;
  tags?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### 5.3. Data Transformation Flow

```
Application DTO
    │
    │ Transform
    ▼
Internal Interface
    │
    │ Map to Novu format
    ▼
Novu API Payload
    │
    │ API Call
    ▼
Novu API Response
    │
    │ Transform
    ▼
Module Response
    │
    │ Return
    ▼
Application Layer
```

### 5.4. Payload Template Variables

Novu sử dụng Handlebars template engine. Payload data được truyền vào workflow có thể được sử dụng trong templates:

```typescript
// Example payload
{
  userName: "John Doe",
  orderId: "ORD-12345",
  amount: "$99.99",
  items: [
    { name: "Product 1", quantity: 2 },
    { name: "Product 2", quantity: 1 }
  ]
}

// Template usage in Novu workflow
// Email subject: "Order {{orderId}} Confirmation"
// Email body: "Hi {{userName}}, your order for {{amount}} has been confirmed."
```

---

## Use Cases

### 6.1. Use Case 1: Gửi Email Xác Nhận Đơn Hàng

**Mô tả**: Khi người dùng đặt hàng thành công, gửi email xác nhận với thông tin đơn hàng.

**Luồng**:
1. Order service tạo đơn hàng thành công
2. Gọi `notificationService.sendNotification()`
3. Module gửi notification qua Novu workflow "order-confirmation"
4. Novu xử lý và gửi email qua provider (SendGrid, AWS SES, v.v.)

**Code Example**:
```typescript
// In OrderService
await this.notificationService.sendNotification({
  to: {
    subscriberId: order.userId,
    email: order.userEmail,
    firstName: order.userFirstName,
  },
  workflowId: 'order-confirmation',
  payload: {
    orderId: order.id,
    orderNumber: order.number,
    totalAmount: order.total,
    items: order.items.map(item => ({
      name: item.productName,
      quantity: item.quantity,
      price: item.price,
    })),
    shippingAddress: order.shippingAddress,
  },
});
```

### 6.2. Use Case 2: Gửi SMS OTP

**Mô tả**: Gửi mã OTP qua SMS khi người dùng đăng nhập hoặc xác thực.

**Luồng**:
1. Auth service yêu cầu OTP
2. Generate OTP code
3. Gọi `notificationService.sendNotification()` với workflow "otp-sms"
4. Novu gửi SMS qua provider (Twilio, AWS SNS, v.v.)

**Code Example**:
```typescript
// In AuthService
const otpCode = generateOTP();
await this.notificationService.sendNotification({
  to: {
    subscriberId: user.id,
    phone: user.phone,
  },
  workflowId: 'otp-sms',
  payload: {
    otpCode: otpCode,
    expiresIn: 5, // minutes
  },
});
```

### 6.3. Use Case 3: In-App Notification + Email Digest

**Mô tả**: Gửi in-app notification ngay lập tức, sau đó gửi email digest hàng ngày nếu có nhiều thông báo chưa đọc.

**Luồng**:
1. Event xảy ra (ví dụ: comment mới)
2. Gửi in-app notification ngay lập tức
3. Novu workflow tự động tạo digest
4. Sau 24h, nếu có nhiều thông báo chưa đọc, gửi email digest

**Code Example**:
```typescript
// In CommentService
await this.notificationService.sendNotification({
  to: {
    subscriberId: post.authorId,
  },
  workflowId: 'comment-digest',
  payload: {
    commentId: comment.id,
    commenterName: comment.authorName,
    postTitle: post.title,
    postUrl: `${baseUrl}/posts/${post.id}`,
  },
});
```

### 6.4. Use Case 4: Multi-Channel Notification với User Preferences

**Mô tả**: Gửi thông báo quan trọng qua nhiều kênh dựa trên user preferences.

**Luồng**:
1. Xác định notification là "important"
2. Kiểm tra user preferences
3. Gửi qua các kênh được enable:
   - In-App (luôn bật)
   - Email (nếu enabled)
   - Push (nếu enabled và có device token)
   - SMS (chỉ nếu urgent và enabled)

**Code Example**:
```typescript
// In NotificationService (internal logic)
const preferences = await this.getSubscriberPreferences(userId);

await this.sendNotification({
  to: {
    subscriberId: userId,
    email: preferences.email.enabled ? user.email : undefined,
    phone: preferences.sms.enabled && isUrgent ? user.phone : undefined,
  },
  workflowId: 'important-notification',
  payload: {
    title: 'Important Update',
    message: 'Your account has been upgraded to Premium',
    actionUrl: `${baseUrl}/account`,
  },
});
```

### 6.5. Use Case 5: Bulk Notifications

**Mô tả**: Gửi thông báo cho nhiều người dùng cùng lúc (ví dụ: thông báo hệ thống).

**Luồng**:
1. Lấy danh sách subscribers
2. Gọi Novu bulk trigger API
3. Novu xử lý song song

**Code Example**:
```typescript
// In NotificationService
async sendBulkNotification(
  subscriberIds: string[],
  workflowId: string,
  payload: Record<string, any>,
) {
  const events = subscriberIds.map(subscriberId => ({
    to: { subscriberId },
    workflowId,
    payload,
  }));

  return this.provider.triggerBulk(events);
}
```

---

## Chi Tiết Implementation

### 7.1. Notification Module

```typescript
// notification.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationService } from './notification.service';
import { NovuProvider } from './providers/novu.provider';
import { NotificationConfig } from './config/notification.config';

@Global() // Make module available globally
@Module({
  imports: [ConfigModule],
  providers: [
    NotificationService,
    {
      provide: 'NOTIFICATION_PROVIDER',
      useClass: NovuProvider,
    },
    NotificationConfig,
  ],
  exports: [NotificationService],
})
export class NotificationModule {
  static forRoot(options?: NotificationModuleOptions) {
    return {
      module: NotificationModule,
      providers: [
        {
          provide: 'NOTIFICATION_CONFIG',
          useValue: options || {},
        },
        NotificationService,
        {
          provide: 'NOTIFICATION_PROVIDER',
          useClass: NovuProvider,
        },
      ],
      exports: [NotificationService],
    };
  }
}
```

### 7.2. Notification Service (Facade)

```typescript
// notification.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { NotificationProvider } from './providers/notification.provider.interface';
import { SendNotificationDto } from './dto/send-notification.dto';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';

@Injectable()
export class NotificationService {
  constructor(
    @Inject('NOTIFICATION_PROVIDER')
    private readonly provider: NotificationProvider,
  ) {}

  /**
   * Send a notification via workflow
   */
  async sendNotification(dto: SendNotificationDto): Promise<NotificationResult> {
    // Validation
    this.validateSendNotificationDto(dto);

    // Transform and send
    return this.provider.trigger({
      workflowId: dto.workflowId,
      to: dto.to,
      payload: dto.payload,
      overrides: dto.overrides,
      transactionId: dto.transactionId,
    });
  }

  /**
   * Create or update a subscriber
   */
  async createSubscriber(dto: CreateSubscriberDto): Promise<SubscriberResult> {
    this.validateCreateSubscriberDto(dto);
    return this.provider.createSubscriber(dto);
  }

  /**
   * Update subscriber information
   */
  async updateSubscriber(
    subscriberId: string,
    dto: UpdateSubscriberDto,
  ): Promise<SubscriberResult> {
    return this.provider.updateSubscriber(subscriberId, dto);
  }

  /**
   * Get subscriber preferences
   */
  async getSubscriberPreferences(subscriberId: string) {
    return this.provider.getSubscriberPreferences(subscriberId);
  }

  /**
   * Update subscriber preferences
   */
  async updateSubscriberPreferences(
    subscriberId: string,
    preferences: SubscriberPreferences,
  ) {
    return this.provider.updateSubscriberPreferences(subscriberId, preferences);
  }

  // Private validation methods
  private validateSendNotificationDto(dto: SendNotificationDto) {
    if (!dto.workflowId) {
      throw new Error('workflowId is required');
    }
    if (!dto.to?.subscriberId) {
      throw new Error('subscriberId is required');
    }
    if (!dto.payload) {
      throw new Error('payload is required');
    }
  }

  private validateCreateSubscriberDto(dto: CreateSubscriberDto) {
    if (!dto.subscriberId) {
      throw new Error('subscriberId is required');
    }
  }
}
```

### 7.3. Novu Provider Implementation

```typescript
// providers/novu.provider.ts
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Novu } from '@novu/api';
import { NotificationProvider } from './notification.provider.interface';
import {
  SendNotificationDto,
  CreateSubscriberDto,
  UpdateSubscriberDto,
} from '../dto';

@Injectable()
export class NovuProvider implements NotificationProvider {
  private novu: Novu;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('NOVU_API_KEY');
    const serverUrl = this.configService.get<string>('NOVU_SERVER_URL');

    if (!apiKey) {
      throw new Error('NOVU_API_KEY is required');
    }

    this.novu = new Novu({
      secretKey: apiKey,
      ...(serverUrl && { serverURL: serverUrl }),
    });
  }

  async trigger(dto: SendNotificationDto): Promise<NotificationResult> {
    try {
      const result = await this.novu.trigger({
        workflowId: dto.workflowId,
        to: dto.to,
        payload: dto.payload,
        overrides: dto.overrides,
        transactionId: dto.transactionId,
      });

      return {
        acknowledged: result.data?.acknowledged || false,
        status: result.data?.status === 'processed' ? 'processed' : 'error',
        transactionId: result.data?.transactionId,
      };
    } catch (error) {
      return {
        acknowledged: false,
        status: 'error',
        error: {
          message: error.message,
          code: error.code,
        },
      };
    }
  }

  async createSubscriber(dto: CreateSubscriberDto): Promise<SubscriberResult> {
    const result = await this.novu.subscribers.create(dto);
    return this.mapSubscriberResult(result.data);
  }

  async updateSubscriber(
    subscriberId: string,
    dto: UpdateSubscriberDto,
  ): Promise<SubscriberResult> {
    const result = await this.novu.subscribers.update(subscriberId, dto);
    return this.mapSubscriberResult(result.data);
  }

  async getSubscriberPreferences(subscriberId: string) {
    const result = await this.novu.subscribers.preferences.get(subscriberId);
    return result.data;
  }

  async updateSubscriberPreferences(
    subscriberId: string,
    preferences: SubscriberPreferences,
  ) {
    const result = await this.novu.subscribers.preferences.update(
      subscriberId,
      preferences,
    );
    return result.data;
  }

  private mapSubscriberResult(data: any): SubscriberResult {
    return {
      subscriberId: data.subscriberId,
      email: data.email,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      avatar: data.avatar,
      locale: data.locale,
      timezone: data.timezone,
      data: data.data,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}
```

### 7.4. Provider Interface

```typescript
// providers/notification.provider.interface.ts
import {
  SendNotificationDto,
  CreateSubscriberDto,
  UpdateSubscriberDto,
  NotificationResult,
  SubscriberResult,
  SubscriberPreferences,
} from '../interfaces';

export interface NotificationProvider {
  trigger(dto: SendNotificationDto): Promise<NotificationResult>;
  createSubscriber(dto: CreateSubscriberDto): Promise<SubscriberResult>;
  updateSubscriber(
    subscriberId: string,
    dto: UpdateSubscriberDto,
  ): Promise<SubscriberResult>;
  getSubscriberPreferences(subscriberId: string): Promise<any>;
  updateSubscriberPreferences(
    subscriberId: string,
    preferences: SubscriberPreferences,
  ): Promise<any>;
}
```

### 7.5. Configuration

```typescript
// config/notification.config.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NotificationConfig {
  constructor(private configService: ConfigService) {}

  get apiKey(): string {
    return this.configService.get<string>('NOVU_API_KEY') || '';
  }

  get serverUrl(): string | undefined {
    return this.configService.get<string>('NOVU_SERVER_URL');
  }

  get appId(): string | undefined {
    return this.configService.get<string>('NOVU_APP_ID');
  }
}
```

## Tái Sử Dụng và Mở Rộng

### 8.1. Tích Hợp vào Dự Án Mới

#### Bước 1: Cài đặt Dependencies

```bash
npm install @nestjs/common @nestjs/core @nestjs/config @novu/api
```

#### Bước 2: Import Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NotificationModule.forRoot(),
  ],
})
export class AppModule {}
```

#### Bước 3: Sử dụng trong Service

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
    // Create order logic...
    const order = await this.orderRepository.save(orderData);

    // Send notification
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

### 8.2. Custom Provider Implementation

Nếu muốn sử dụng provider khác ngoài Novu hoặc tạo custom provider:

```typescript
// providers/custom.provider.ts
import { Injectable } from '@nestjs/common';
import { NotificationProvider } from './notification.provider.interface';

@Injectable()
export class CustomProvider implements NotificationProvider {
  async trigger(dto: SendNotificationDto): Promise<NotificationResult> {
    // Custom implementation
  }

  // Implement other methods...
}

// In module
@Module({
  providers: [
    {
      provide: 'NOTIFICATION_PROVIDER',
      useClass: CustomProvider, // Use custom provider
    },
  ],
})
export class NotificationModule {}
```

### 8.3. Mở Rộng với Decorators

Tạo decorators để tự động gửi notification:

```typescript
// decorators/notification.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const NOTIFICATION_METADATA = 'notification';

export interface NotificationMetadata {
  workflowId: string;
  getSubscriberId: (result: any) => string;
  getPayload: (result: any) => Record<string, any>;
}

export const Notify = (metadata: NotificationMetadata) =>
  SetMetadata(NOTIFICATION_METADATA, metadata);

// Usage
@Notify({
  workflowId: 'order-confirmation',
  getSubscriberId: (order) => order.userId,
  getPayload: (order) => ({ orderId: order.id }),
})
async createOrder() {
  // ...
}
```

### 8.4. Middleware/Interceptor cho Auto-notification

```typescript
// interceptors/notification.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { NotificationService } from '../notification.service';
import { Reflector } from '@nestjs/core';

@Injectable()
export class NotificationInterceptor implements NestInterceptor {
  constructor(
    private notificationService: NotificationService,
    private reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      tap(async (result) => {
        const metadata = this.reflector.get(
          NOTIFICATION_METADATA,
          context.getHandler(),
        );

        if (metadata) {
          await this.notificationService.sendNotification({
            to: {
              subscriberId: metadata.getSubscriberId(result),
            },
            workflowId: metadata.workflowId,
            payload: metadata.getPayload(result),
          });
        }
      }),
    );
  }
}
```

### 8.5. Testing Strategy

#### Unit Tests

```typescript
// notification.service.spec.ts
describe('NotificationService', () => {
  let service: NotificationService;
  let provider: NotificationProvider;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: 'NOTIFICATION_PROVIDER',
          useValue: {
            trigger: jest.fn(),
            createSubscriber: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    provider = module.get('NOTIFICATION_PROVIDER');
  });

  it('should send notification', async () => {
    const dto = {
      to: { subscriberId: 'user-1' },
      workflowId: 'test-workflow',
      payload: {},
    };

    jest.spyOn(provider, 'trigger').mockResolvedValue({
      acknowledged: true,
      status: 'processed',
    });

    const result = await service.sendNotification(dto);

    expect(provider.trigger).toHaveBeenCalledWith(dto);
    expect(result.acknowledged).toBe(true);
  });
});
```

#### Integration Tests

```typescript
// notification.integration.spec.ts
describe('Notification Integration', () => {
  let app: INestApplication;
  let notificationService: NotificationService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot(),
        NotificationModule,
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    notificationService = module.get<NotificationService>(NotificationService);
  });

  it('should send real notification', async () => {
    const result = await notificationService.sendNotification({
      to: {
        subscriberId: 'test-user',
        email: 'test@example.com',
      },
      workflowId: 'test-workflow',
      payload: { message: 'Test' },
    });

    expect(result.acknowledged).toBe(true);
  });
});
```

---

## 10. Webhook & Status Tracking

### 10.1. Tổng Quan

Module core cung cấp các interface và DTO để hỗ trợ xử lý webhook trạng thái từ Novu, nhưng **không tự tạo controller** để tránh coupling với routing/security của từng dự án.

### 10.2. Components Cung Cấp

1. **NovuWebhookEvent Interface** (`src/notification/interfaces/novu-webhook-event.interface.ts`):
   - DTO chuẩn hóa cho webhook payload từ Novu
   - Bao gồm: `id`, `type`, `timestamp`, `workflowId`, `stepId`, `channel`, `status`, `subscriberId`, `provider`, `metadata`, v.v.

2. **NotificationLog Interface** (`src/notification/interfaces/notification-log.interface.ts`):
   - Định nghĩa cấu trúc entity cho bảng `notification_logs`
   - Bao gồm `CreateNotificationLogDto` để tạo log mới

3. **NotificationStatusIRepository Interface** (`src/notification/interfaces/notification-status-i-repository.interface.ts`):
   - Interface tối thiểu cho repository để lưu và query logs
   - Project host implement với ORM của họ

### 10.3. Mẫu Implementation

Module cung cấp các file mẫu trong `docs/examples/`:

- `novu-webhook.controller.example.ts`: Mẫu controller xử lý webhook
- `notification-status.service.example.ts`: Mẫu service map event → log và lưu DB
- `notification-log.entity.example.ts`: Mẫu entity cho TypeORM, Prisma, Mongoose, SQL migration

### 10.4. Tài Liệu Tích Hợp

Xem chi tiết trong:
- `docs/docs-notification/WEBHOOK_INTEGRATION.md`: Hướng dẫn tích hợp cho project host
- `docs/Implement_Guide.md`: Section 3.5 về webhook

---

## Tổng Kết

Module NestJS Notification với Novu được thiết kế để:

1. **Tách biệt concerns**: Logic thông báo hoàn toàn độc lập với business logic
2. **Dễ tích hợp**: API đơn giản, rõ ràng, dễ sử dụng
3. **Linh hoạt**: Hỗ trợ nhiều kênh, có thể mở rộng dễ dàng
4. **Tái sử dụng**: Có thể sử dụng trong nhiều dự án khác nhau
5. **Testable**: Dễ dàng test với mock providers
6. **Maintainable**: Code structure rõ ràng, dễ maintain
7. **Webhook Support**: Cung cấp interface và mẫu để xử lý webhook trạng thái từ Novu

Module này cung cấp một abstraction layer mạnh mẽ cho việc gửi thông báo đa kênh, cho phép các dự án tập trung vào business logic mà không cần quan tâm đến chi tiết implementation của notification system.

---

## Tài Liệu Tham Khảo

1. **Novu Official Documentation**: https://docs.novu.co
2. **Novu API SDK**: https://github.com/novuhq/novu/tree/next/packages/novu
3. **Novu Framework**: https://github.com/novuhq/novu/tree/next/packages/framework
4. **NestJS Documentation**: https://docs.nestjs.com
5. **Context7 Novu Documentation**: /novuhq/novu và /novuhq/docs

---

**Ngày tạo**: 2025-01-16  
**Phiên bản**: 1.0.0  
**Tác giả**: Research và Documentation

