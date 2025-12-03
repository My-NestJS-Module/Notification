---
title: Workflow Patterns & Best Practices — NestJS + Novu + Redis
---

> Tài liệu tập trung vào **patterns** và **best practices** cho thiết kế workflow notification đa kênh.  
> Nội dung được chia theo 4 cấp: **Junior, Middle, Senior, Principal**.

## 1. Junior — Patterns cơ bản

- **Pattern 1: API → Workflow đơn kênh**
  - Use case: gửi email xác nhận, email đơn giản.
  - Luồng:
    - API nhận request → gọi trực tiếp `Novu.trigger('simple-email', ...)`.
  - Áp dụng cho:
    - POC, demo, chức năng ít traffic.

- **Pattern 2: In-app + Email song song**
  - Workflow trên Novu:
    - Step 1: In-app notification.
    - Step 2: Email notification.
  - Backend chỉ cần gửi 1 trigger với `workflowKey` đã định nghĩa.

- **Pattern 3: Notification theo sự kiện domain**
  - Thay vì gọi “sendEmail”, backend phát sự kiện:
    - `user.registered`, `order.created`, `order.shipped`.
  - Notification service/submodule lắng nghe và quyết định workflow tương ứng.

## 2. Middle — Patterns với Redis & Retry

- **Pattern 4: Queue-based Notification**
  - API không gửi notification trực tiếp, chỉ:
    - Validate.
    - Push job `send-notification` vào Redis queue.
  - Worker xử lý queue:
    - Gửi tới Novu.
  - Lợi ích:
    - Cô lập lỗi provider.
    - Hỗ trợ retry/backoff.

- **Pattern 5: Retry với Backoff & Dead Letter Queue (DLQ)**
  - Config queue:
    - `attempts: N`, `backoff: exponential`.
  - Nếu job fail nhiều lần:
    - Đưa job vào DLQ, log để SRE/dev xem xét.

- **Pattern 6: Idempotent Send**
  - Sử dụng `notificationId` hoặc `idempotencyKey`.
  - Trước khi gửi:
    - Check Redis/DB xem notification đó đã được gửi thành công chưa.
  - Tránh trường hợp gửi trùng do retry hoặc glitch mạng.

## 3. Senior — Advanced Workflow Patterns

### 3.0. Pattern: Pub/Sub bằng Novu Topics

- **Ý tưởng**
  - Dùng **topic** của Novu như một lớp pub/sub dành riêng cho notification.
  - Backend publish 1 lần tới topic, Novu fan-out tới tất cả subscribers trong topic qua các kênh.

- **Luồng**
  1. Khi user join nhóm/tenant/project:
     - Backend gọi Novu API: add subscriber vào topic tương ứng (`tenant-{id}`, `project-{id}`, `channel-{id}`…).
  2. Khi có sự kiện:
     - Domain service phát event nội bộ → Notification service nhận → trigger workflow tới topic.
  3. Mọi subscriber trong topic nhận notification (In-app/Email/SMS/Push tuỳ workflow).

- **Use case**
  - Broadcast maintenance/downtime.
  - Thông báo thay đổi policy cho toàn bộ tenant.
  - Chat room / channel notification (social, collaboration).

### 3.1. Pattern: Multi-channel Fallback

- **Mục tiêu**
  - Ưu tiên kênh rẻ/dễ chịu (In-app, Push), fallback sang kênh đắt hơn (SMS).

- **Ví dụ**
  - Bước 1: Gửi Push (mobile).
  - Bước 2: Nếu sau X phút user chưa open app → gửi SMS.

- **Cách triển khai**
  - Novu workflow:
    - Step Push.
    - Delay.
    - Step SMS với điều kiện (condition) trên event/user state.
  - Backend chỉ cần cung cấp đủ context (user preferences, device tokens…).

### 3.2. Pattern: Priority & Throttling

- **Priority**
  - Gán priority cho job queue:
    - `high` (OTP, security alerts).
    - `normal` (order updates).
    - `low` (marketing).

- **Throttling / Rate limiting**
  - Hạn chế:
    - Số email/SMS per user per day.
    - Số push per minute.
  - Dùng Redis:
    - Key pattern: `notification:rate:{subscriberId}:{channel}`.

### 3.3. Pattern: Topic-based Notifications

- Thay vì gửi theo từng subscriber:
  - Tạo `topics` (theo team, org, tenant, feature flag).
  - Gửi 1 trigger đến topic.
  - Dễ dàng broadcast thông báo (maintenance, downtime…).

### 3.4. Pattern: Event Sourcing cho Notification Logs

- Lưu tất cả event notification vào log stream (Redis stream / Kafka / DB append-only).
- Cho phép:
  - Replay.
  - Analytics (CTR, open rate, conversion).
  - Audit/compliance.

## 4. Principal — Thiết kế hệ thống thông báo ở scale lớn

### 4.1. Pattern: Notification as a Platform (NaaP)

- Tách notification thành platform dùng chung cho nhiều product/team:
  - Cung cấp API/SDK thống nhất.
  - Multi-tenant.
  - Config-driven (templates, workflows, routing).

- Kiến trúc:
  - **Core**:
    - Domain logic, routing, rules engine.
  - **Connectors**:
    - Novu, Twilio, SendGrid, FCM, Slack, v.v.
  - **Clients**:
    - Các backend service khác, frontend, batch jobs.

### 4.2. Pattern: Configuration-Driven Workflows

- Không hard-code workflow map trong code:
  - Lưu mapping cấu hình (DB/config service):
    - `eventKey` → `workflowKey`, `channels`, `priority`, `constraints`.
  - Cho phép:
    - Thay đổi hành vi gửi notification mà không cần deploy code.

### 4.3. Pattern: A/B Testing & Progressive Rollout

- Ví dụ:
  - 50% user nhận template A.
  - 50% user nhận template B.
  - Đo CTR, conversion để chọn template tối ưu.

- Cách làm:
  - Backend quyết định variant (A/B) dựa trên user hash.
  - Trigger workflow khác nhau hoặc gửi biến `variant` trong payload.

### 4.4. Pattern: Observability-First Design

- Thiết kế từ đầu với:
  - **Logs** đầy đủ: request, job, webhook, errors.
  - **Metrics**:
    - Số lượng notification per event/channel.
    - Delivery success rate, latency.
  - **Tracing**:
    - Correlation ID xuyên suốt luồng.

### 4.5. Pattern: Security & Compliance

- Bảo vệ dữ liệu PII:
  - Encrypt/Mask email, phone trong log.
  - Không log toàn bộ nội dung nhạy cảm.
  - Hỗ trợ xoá dữ liệu (GDPR “right to be forgotten”).

- Bảo mật webhook:
  - Xác thực signature từ Novu.
  - Hạn chế IP, rate limit endpoint webhook.

---

## 5. Best Practices theo cấp độ

### 5.1. Junior

- Luôn:
  - Validate input khi gửi notification.
  - Log lại mỗi lần gửi (ít nhất ở mức info).
  - Tách DTO rõ ràng (không dùng `any`).

### 5.2. Middle

- Dùng queue (Redis + Bull/BullMQ) thay vì gọi trực tiếp provider trong request.
- Cấu hình retry + backoff hợp lý.
- Bắt đầu áp dụng rate limiting cơ bản.

### 5.3. Senior

- Chuẩn hoá domain model cho notification.
- Hỗ trợ đa kênh (In-app, Email, SMS, Push) với routing linh hoạt.
- Thiết lập cơ chế quan sát (metrics, alerting) cho toàn bộ pipeline.

### 5.4. Principal

- Thiết kế notification như một **nền tảng**:
  - Multi-tenant.
  - Config-driven.
  - Dễ plug-in/plug-out provider.
- Đảm bảo hệ thống tuân thủ các yêu cầu bảo mật & pháp lý (GDPR, audit trail…).


