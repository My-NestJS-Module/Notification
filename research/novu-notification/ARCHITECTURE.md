---
title: Kiến trúc Notification với NestJS + Novu + Redis
---

## 1. Tổng quan (Junior)

- **Mục tiêu**
  - Xây dựng hệ thống thông báo đa kênh (In-app, Email, SMS, Push/Mobile) cho backend NestJS.
  - Tận dụng Novu làm notification orchestrator & template manager.
  - Dùng Redis để xử lý bất đồng bộ, queue và cache giúp hệ thống mở rộng tốt.

- **Thành phần chính**
  - **Backend NestJS**: Nhận request từ ứng dụng (web/mobile/backend khác), validate, ghi log, đẩy job vào Redis, gọi Novu khi cần.
  - **Novu**: Quản lý workflows, templates, subscriber, channel (In-app, Email, SMS, Push) và tích hợp với provider (SendGrid, Twilio, FCM…).
  - **Redis**: Dùng làm:
    - Message queue (Bull/BullMQ) cho job gửi notification.
    - Cache cho trạng thái notification, preferences.
    - Pub/Sub cho real-time event nội bộ (tuỳ chọn).

- **Luồng cơ bản**
  1. Client (web/mobile/service khác) gọi API NestJS để tạo/sent notification.
  2. NestJS validate dữ liệu, build DTO, push job vào queue Redis.
  3. Worker NestJS (hoặc dedicated notification service) lấy job từ Redis, gọi Novu trigger workflow.
  4. Novu thực thi workflow, gửi thông báo qua các kênh (In-app, Email, SMS, Push).
  5. Novu gửi webhook về NestJS để cập nhật trạng thái (delivered, seen, error…).

## 2. Kiến trúc lớp & cấu trúc thư mục (Middle)

- **Kiến trúc đề xuất trong NestJS**
  - `notification/`
    - `notification.module.ts` — module chính.
    - `notification.service.ts` — orchestrator, business logic.
    - `providers/`
      - `novu.provider.ts` — wrapper client Novu (REST/SDK).
      - `notification.provider.interface.ts` — interface abstraction các provider.
    - `dto/` — DTO cho create subscriber, send notification, update subscriber, v.v.
    - `interfaces/` — domain interfaces (workflow, logs, results, subscriber…).
    - `config/notification.config.ts` — config Novu API key, Redis, queue options.

- **Tầng trong kiến trúc**
  - **API Layer** (Controllers – có thể nằm ngoài module này):
    - Nhận HTTP request, mapping sang DTO.
  - **Application/Service Layer** (`notification.service.ts`):
    - Xử lý use case, gọi repository / provider / queue.
  - **Integration Layer** (`novu.provider.ts`, Redis queue, Redis cache):
    - Giao tiếp với Novu và Redis.
  - **Domain Layer** (`interfaces/`, DTO):
    - Định nghĩa model logic (NotificationLog, Subscriber, Workflow…).

- **Mối quan hệ với Redis**
  - Queue: `notifications:queue` cho job gửi notification.
  - Cache: `notification:status:{id}`, `notification:preferences:{subscriberId}`.
  - Pub/Sub (tuỳ chọn): channel `notifications:events` để truyền event nội bộ.

## 3. Dependencies & Environment Variables (Middle)

- **Novu**
  - `NOVU_API_KEY`
  - `NOVU_API_URL` (nếu dùng self-host)
  - `NOVU_APP_ID` hoặc `NOVU_ENVIRONMENT_ID` (tuỳ cấu hình)

- **Redis**
  - `REDIS_HOST`
  - `REDIS_PORT`
  - `REDIS_USERNAME` (nếu có)
  - `REDIS_PASSWORD` (nếu có)

- **NestJS**
  - `NODE_ENV`, `PORT`…

- **Security & Observability (high-level)**
  - Sử dụng HTTPS/TLS cho tất cả kết nối (backend ↔ Novu, client ↔ backend).
  - Log, metrics, tracing cho toàn bộ flow gửi notification và nhận webhook.

## 4. Luồng hoạt động chi tiết (Senior)

### 4.1. Luồng gửi notification chuẩn (API → Redis → Worker → Novu)

1. **API Request**
   - Client gửi request: `POST /notifications` với payload chứa:
     - `subscriberId` / `to` (email/phone/device token).
     - `workflowKey` (key định danh workflow trên Novu).
     - `payload` (data để render template).
     - Tuỳ chọn: `channelsOverride`, `tenantId`, `metadata`.

2. **Application / Service**
   - `notification.service`:
     - Validate input.
     - Đảm bảo subscriber tồn tại trên Novu (tạo nếu chưa có).
     - Ghi log “scheduled” vào DB (nếu có).
     - Push job vào Redis queue với payload (id, workflowKey, subscriber, payload…).

3. **Worker**
   - Worker process (có thể là một NestJS microservice):
     - Listen queue `notifications:queue`.
     - Lấy job, gọi `novu.provider.trigger(workflowKey, subscriber, payload, options)`.
     - Cập nhật log trạng thái job (queued → processing → sent).

4. **Novu**
   - Novu:
     - Nhận trigger, xác định workflow, kiểm tra preferences (workflow & subscriber level).
     - Gửi notification qua các kênh:
       - **In-app**: ghi inbox event cho subscriber.
       - **Email**: gửi qua provider (SendGrid, SES…).
       - **SMS**: gửi qua Twilio/Nexmo… (provider).
       - **Push**: gửi qua FCM/APNs hoặc các push provider khác.

5. **Webhook về NestJS**
   - Novu gọi webhook về backend:
     - Sự kiện: delivered, error, seen, action-clicked, v.v.
   - NestJS nhận webhook:
     - Xác thực signature (nếu có).
     - Cập nhật DB/Redis log.
     - Có thể phát Pub/Sub nội bộ.

### 4.2. Luồng đọc In-app notifications (Client → Backend → Novu/DB)

1. Client (web/mobile) gọi API: `GET /notifications/in-app`.
2. Backend:
   - Tuỳ kiến trúc:
     - Đọc từ DB local (đã sync từ webhook Novu).
     - Hoặc call trực tiếp Novu API lấy notification feed.
3. Trả về danh sách notification, phân trang, trạng thái (unread/read, seen…).

### 4.3. Luồng Push/Mobile (FCM/APNs, Web Push)

- Subscriber có thể có:
  - Device token (mobile app – FCM/APNs).
  - Web push subscription (web browser).
- Novu mapping subscriber → channel settings (push/chat).
- Khi workflow có step Push:
  - Novu gửi notification đến provider tương ứng (FCM/APNs/web push gateway).
  - App client nhận push, hiển thị notification native.

## 5. Mô hình Pub/Sub với Novu Topics (Senior)

### 5.1. Novu như một lớp pub/sub cho notification

- **Publish**:
  - Backend không gửi trực tiếp tới từng subscriber, mà gửi tới **topic** trên Novu (ví dụ: `order-updates`, `system-alerts`, `tenant-{id}`).
  - Gọi trigger workflow với `to` là topic thay vì subscriber đơn lẻ.
- **Subscribe**:
  - Subscriber (user) được **gắn vào topic** thông qua Novu:
    - Khi user join team/project/tenant → backend gọi Novu API để add subscriber vào topic tương ứng.
    - Khi user rời/bị revoke → remove subscriber khỏi topic.
- **Kết quả**:
  - Gần tương đương mô hình **pub/sub cho thông báo**:
    - Backend “publish” 1 event tới topic.
    - Tất cả subscribers trong topic “receive” notification qua các kênh (In-app, Email, SMS, Push).

> Lưu ý: Novu **không thay thế message broker** (Kafka, Redis Pub/Sub…) cho các event nội bộ thuần backend, mà tập trung vào pub/sub ở lớp **notification**.

### 5.2. Kết hợp Redis + Novu topics

- Redis:
  - Dùng để:
    - Nhận & phân phối domain events nội bộ.
    - Buffer/queue trước khi gửi sang Novu.
- Novu:
  - Dùng để:
    - Định tuyến notification theo topic.
    - Quản lý subscriber của từng topic và channel.

> Pattern gợi ý:  
> Domain Service → (publish domain event) → Redis / message bus → Notification Service → (trigger workflow tới topic trên Novu).

## 6. 5 Use Cases thực tế (Senior)

1. **Xác nhận đăng ký tài khoản (Email + In-app)**
   - Khi user đăng ký, backend gửi workflow “user-signup-confirmation”.
   - Novu gửi email kèm link xác nhận + in-app notification trong dashboard.

2. **OTP đăng nhập (SMS + Push)**
   - User yêu cầu OTP, backend trigger workflow “login-otp”.
   - SMS gửi mã OTP, đồng thời push notification đến mobile app (nếu user đang login trên app).

3. **Thông báo đơn hàng (Email + In-app + Push)**
   - Order created/updated, backend gửi workflow “order-status-changed”.
   - Email invoice, in-app timeline order, push tới điện thoại nếu trạng thái quan trọng (shipped/delivered).

4. **Cảnh báo lỗi hệ thống (Email + SMS cho admin)**
   - Service internal detect error lớn → gửi event tới notification backend.
   - Workflow gửi email + SMS cho on-call engineer, có retry & escalation.

5. **Thông báo tương tác social (In-app + Push, dùng topic)**
   - Comment mới, like, mention → trigger workflow “social-activity”.
  - Mỗi user join vào topic theo group/channel (vd: `post-{postId}`, `room-{roomId}`).
  - In-app hiển thị badge, push notification tới mobile app ngay lập tức.

## 7. Chi tiết implementation & code examples (Senior)

> Phần này sẽ được liên kết chặt với `Implement_Guide.md` để tránh trùng lặp.  
> Tại đây chỉ mô tả các “điểm kết nối” code quan trọng:

- **NestJS → Redis queue**
  - Service push job notification với payload chuẩn hoá.
- **Worker → Novu**
  - Dùng Novu REST API/SDK TypeScript để trigger workflow.
- **Novu Webhook → NestJS**
  - Controller chuyên nhận webhook, cập nhật trạng thái vào DB/Redis.
- **In-app feed API**
  - Endpoint trả về danh sách notification đã được chuẩn hoá cho client.

Chi tiết code: xem `Implement_Guide.md`.

## 8. Hướng dẫn tái sử dụng & mở rộng (Principal)

- **Tách Notification thành bounded context riêng**
  - Tách module notification thành **service độc lập** (microservice), giao tiếp qua message bus (Kafka/NATS/RabbitMQ), Redis queue chỉ là một phần.
  - Các domain khác (Order, Auth, Billing…) chỉ gửi sự kiện, không biết chi tiết Novu.

- **Abstraction Provider**
  - `NotificationProviderInterface` ẩn đi chi tiết Novu.
  - Cho phép thay thế/ghép thêm provider khác (in-house, AWS SNS, Twilio trực tiếp…) mà không đổi business logic.

- **Multi-tenant & environment**
  - Mapping `tenantId` ↔ `Novu environment` hoặc `topic` để tách luồng tenant.
  - Config per-tenant preferences, limits, templates.

- **Scalability & Reliability**
  - Scale worker theo queue length (auto-scaling).
  - Dùng retry với exponential backoff trong queue.
  - Idempotency key cho mỗi notification để tránh gửi trùng.

- **Observability**
  - Tracing cross-system: API → Worker → Novu → Provider → Webhook → DB.
  - Metrics: throughput, error rate per channel, latency end-to-end.


