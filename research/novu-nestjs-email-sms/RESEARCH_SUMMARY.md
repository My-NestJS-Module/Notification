## Nguồn thông tin đã sử dụng

### Novu – Official Docs & Repos (qua Context7)
- **Khái niệm & kiến trúc Novu**:
  - Workflows, events, notification lifecycle, integrations (SendGrid, Twilio…).
  - Cách Novu chọn integration và gửi email/SMS qua provider.
- **API & SDK**:
  - `POST /v1/events/trigger` – Trigger một workflow với `name`, `to`, `payload`, `overrides`, `transactionId`.
  - `POST /v1/events/trigger/bulk` – Gửi nhiều event trong một request (up to 100).
  - SDK `@novu/api` & `@novu/stateless` – Trigger workflow từ Node/TypeScript.
- **Novu Framework (code-first workflows)**:
  - Cách dùng `workflow(...)`, `step.email(...)`, `step.sms(...)`, `step.digest(...)`, `step.delay(...)`.
  - Tích hợp với `zod` để validate `payloadSchema`.
  - Trigger workflow bằng `.trigger({ to, payload })`.

### NestJS – Kiến trúc & Best Practices
- **Modules, Providers, Controllers**:
  - Cách chia module, export service, chia sẻ provider giữa nhiều module.
- **Configuration**:
  - Dùng `@nestjs/config` để inject biến môi trường (`NOVU_API_KEY`, `NOVU_API_URL`…).
- **Layered Architecture & Patterns**:
  - Module per domain, repository pattern, dynamic modules (tham khảo concept để thiết kế Notification module).

### Internet & Code Research (Tavily, code_research)
- **Novu Framework Overview**:
  - Hỗ trợ NestJS, Express, Next.js,….
  - Chạy core workflow engine bên trong hạ tầng của bạn, giao tiếp với Novu Cloud.
- **System Design & Notification Architecture**:
  - Bài viết về kiến trúc notification multi-channel (Email, SMS, Push).
  - Các best practices về decoupling, retry, queues, template-driven design.
- **Open-source repos liên quan đến Novu**:
  - Monorepo Novu, ví dụ kiến trúc internal & cách dùng BullMQ, NestJS.

---

## Key Findings – Những kết luận chính

### 1. Novu rất hợp để làm “Notification Orchestrator”
- Thay vì backend tự gọi từng provider (SendGrid, Twilio), backend:
  - Chỉ cần:
    - Trigger **workflow** trên Novu với `name`/`workflowId`.
    - Pass **subscriber info** + **payload**.
  - Mọi logic:
    - Chọn kênh (Email, SMS, Push, In-App).
    - Template, điều kiện, retry, digest.
    - Được xử lý trong Novu.

### 2. Hai cách tiếp cận chính
- **(A) Novu Cloud (REST API / SDK)**:
  - Đơn giản, phù hợp bắt đầu nhanh.
  - NestJS gọi `POST /v1/events/trigger` hoặc dùng `@novu/api`.
  - Workflow & templates được tạo trong Novu UI.
- **(B) Novu Framework (code-first)**:
  - Định nghĩa workflow bằng TypeScript, deploy cùng app.
  - Hỗ trợ logic phức tạp (multi-step, delay, digest, conditional routing).
  - Payload type-safe, dễ test, versioning tốt.

=> Kiến trúc đề xuất: **kết hợp** cả hai:
- Use case đơn giản / business thay đổi thường xuyên:
  - Tạo workflow & template trong UI.
- Use case phức tạp / critical:
  - Viết workflow bằng Novu Framework, commit trong repo.

### 3. Email + SMS nên được coi là các “channel” trong 1 use case, không phải 2 hệ thống riêng
- Ví dụ `order-confirmation`:
  - 1 workflow:
    - Step Email: chi tiết đầy đủ (items, price…).
    - Step SMS: message ngắn gọn (mã đơn, trạng thái).
- Backend:
  - Chỉ cần trigger **một event** với payload chuẩn.

### 4. NestJS phù hợp với thiết kế module “Notifications” riêng
- Tách `NotificationsModule`:
  - Chỉ expose service/gateway:
    - `sendEmail`, `sendSms`, `sendMultiChannel`, `sendUseCaseXyz`.
  - Các module domain khác (Auth, Orders, Billing…) không biết chi tiết Novu.
- Dùng `@nestjs/config` để cấu hình:
  - API key, endpoint, toggles (enable/disable SMS, env-specific configs).

### 5. Event-Driven Architecture rất hợp với Notification
- Thay vì:
  - Trong `OrderService` gọi luôn `notificationsService`.
- Gợi ý:
  - `OrderService` publish event `order.created`.
  - `NotificationService` subscribe event và trigger workflow phù hợp.
- Benefit:
  - Giảm coupling.
  - Dễ bổ sung kênh mới (push, in-app) mà không thay đổi core services.

---

## Proposed Architecture – Kiến trúc đề xuất

### 1. Ở mức đơn giản (Junior/Middle)
- **NestJS**:
  - Module `NotificationsModule`:
    - `NotificationsService`:
      - Gọi `POST /v1/events/trigger` của Novu.
    - `NotificationsController`:
      - Expose 1–2 endpoint demo (`/notifications/send`, `/notifications/welcome`).
  - Sử dụng DTO đơn giản cho Email/SMS.
- **Novu**:
  - Tạo workflows:
    - `user-registration`, `order-confirmation`, `subscription-renewal-reminder`…
  - Mỗi workflow:
    - Ít nhất 1 step Email, 1 step SMS (nếu cần).

### 2. Ở mức Senior – Layered & Framework
- **Layered Architecture**:
  - **Presentation**: NestJS controllers + DTO.
  - **Application**: Use cases `SendXyzNotificationUseCase`.
  - **Domain**: `Notification` entities/value objects, `INotificationGateway`.
  - **Infrastructure**: `NovuNotificationGateway`, adapter Novu Framework workflows.
- **Novu Framework**:
  - Viết workflows cho:
    - Order updates.
    - Security events (OTP, password reset).
    - Digest (daily/weekly).
  - Dùng `zod` để validate payload.

### 3. Ở mức Principal – Notification Platform
- Tách **Notification Service** thành microservice riêng:
  - Chỉ nhận event (HTTP hoặc message broker).
  - Chịu trách nhiệm:
    - Mapping event → workflow.
    - Trigger Novu Cloud / Novu Framework workflows.
    - Logging / metrics / audit.
- Các dịch vụ khác:
  - Chỉ publish event, không gửi email/sms trực tiếp.

---

## Use Cases chính đã xác định

- **1. Welcome Email + optional SMS**:
  - Sau khi user đăng ký.
  - Email: chào mừng, hướng dẫn bước tiếp theo.
  - SMS (nếu có số điện thoại): bản rút gọn, dẫn link tới app.

- **2. Login OTP (Email + SMS)**:
  - Khi user đăng nhập với 2FA:
    - Sinh OTP → gửi qua SMS hoặc Email (hoặc cả hai).
  - Workflow có thể:
    - Email trước, nếu không click/sử dụng → gửi SMS nhắc.

- **3. Order Confirmation & Delivery Updates**:
  - Order created → Email chi tiết + SMS xác nhận.
  - Order shipped/delivered → Email/SMS ngắn báo trạng thái + tracking link.

- **4. Subscription Renewal Reminder**:
  - Gửi trước X ngày:
    - Email: nội dung đầy đủ về gói, giá, ngày hết hạn, CTA thanh toán.
    - SMS: nhắc ngắn kèm short link.
  - Có thể kết hợp digest để tránh spam nếu có nhiều subscription.

- **5. Payment Failed / Dunning**:
  - Khi charge thất bại:
    - Email: chi tiết lỗi, link cập nhật thẻ.
    - SMS: nhắc quan trọng (đặc biệt với user premium/doanh nghiệp).
  - Có chiến lược multi-step:
    - Lần 1: Email.
    - Lần 2: Email + SMS sau vài ngày nếu chưa xử lý.

- **6. Security & Account Alerts** (mở rộng):
  - Login từ thiết bị lạ.
  - Đổi password/email/phone.
  - Gửi song song Email + SMS để giảm rủi ro bị chiếm account.

---

## Gợi ý áp dụng theo cấp độ

- **Junior**:
  - Bắt đầu với kiến trúc `NotificationsModule` đơn giản + Novu Cloud.
  - Implement 1–2 use case: Welcome, Order Confirmation.
- **Middle**:
  - Trừu tượng hóa `INotificationGateway`.
  - Tách Use Cases riêng cho mỗi hành vi gửi thông báo.
  - Chuẩn hóa DTO/payload giữa các module.
- **Senior**:
  - Áp dụng layered architecture, event-driven khi phù hợp.
  - Bắt đầu dùng Novu Framework cho workflows phức tạp.
  - Thêm observability: logs, tracing, metrics.
- **Principal**:
  - Thiết kế Notification như một platform/microservice.
  - Đảm bảo resiliency, rate limiting, compliance, multi-region, versioning.


