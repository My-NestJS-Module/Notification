---
title: Research Summary — NestJS + Novu + Redis Notifications
---

## 1. Nguồn thông tin đã sử dụng

### 1.1. Tài liệu chính thức Novu (Context7 / GitHub)

- **Novu Docs — Workflows & Channels**  
  - URL: `https://github.com/novuhq/docs` (nhiều file, trích đặc biệt từ):
    - `content/docs/platform/how-novu-works.mdx`
      - Mô tả core concepts: workflows, channels (email, SMS, push, chat, in-app), subscribers, topics.
    - `content/docs/platform/concepts/workflows.mdx`
      - Khái niệm workflow, step, trigger, channel preferences.
    - `content/docs/framework/typescript/workflow.mdx`
      - Cấu hình workflow bằng TypeScript SDK, `channels` object, `all.enabled`, channel preferences.
    - `content/docs/platform/concepts/integrations.mdx`
      - Primary/active integrations per channel, cách Novu route đến provider (email/SMS/push/chat).
    - `content/docs/platform/concepts/preferences.mdx`
      - Workflow preferences vs subscriber preferences, enable/disable channel per workflow.
    - `content/docs/api-reference/subscribers/subscriber-schema*.mdx`
      - `ChannelSettingsDto`, mapping credentials cho push/chat provider.

- **Novu Docs — Topics (pub/sub-style cho notification)**  
  - URL: `https://docs.novu.co/platform/concepts/topics`  
  - Nội dung chính:
    - Khái niệm **topic** như một nhóm subscribers logic.
    - Backend có thể add/remove subscriber khỏi topic và trigger workflows tới topic.
    - Cho phép mô hình **publish once, deliver to many** cho các thông báo broadcast.

### 1.2. Bài viết & nguồn tổng quan kiến trúc

- **Introduction to Novu Architecture**  
  - URL: `https://novu-preview.mintlify.app/architecture/introduction`  
  - Nội dung chính:
    - Novu là notification infrastructure, multi-channel, tập trung vào inbox/in-app.
    - Chạy trên AWS, có kiến trúc đảm bảo reliability & scalability.
    - Nhấn mạnh vai trò của các channel & providers.

- **System architecture for notifications (LinkedIn post)**  
  - URL: `https://www.linkedin.com/posts/abhishek-raj-583791126_systemarchitecture-notification-aws-activity-7371083198354677760-49C9`  
  - Nội dung:
    - Mô tả một kiến trúc notification đa kênh:
      - Providers: Firebase (Push), AWS SNS/Pinpoint, SMTP/SES, Twilio, Novu.
    - Key lessons:
      - Decouple bằng queue.
      - Retry với exponential backoff.
      - Tôn trọng user preferences.
      - Observability là bắt buộc.

- **Mobile App Backend Development (event-driven)**  
  - URL: `https://www.aalpha.net/blog/mobile-app-backend-development/`  
  - Liên quan:
    - Kiến trúc event-driven, message broker cho các sự kiện như notification.
    - Khuyến nghị decouple backend & notification qua event/message.

### 1.3. Nguồn khác

- **Novu open-source repo**  
  - URL: `https://github.com/novuhq/novu`  
  - Dùng để tham chiếu cách họ tổ chức code & khái niệm kênh, subscriber, workflow.

> Thời điểm truy cập: 2025-12-02

---

## 2. Phát hiện chính

### 2.1. Về Novu

- Novu được thiết kế như **notification orchestration layer**:
  - Hỗ trợ nhiều kênh: **In-app, Email, SMS, Push, Chat**.
  - Workflow xác định:
    - Khi nào gửi.
    - Gửi qua kênh nào.
    - Template & payload dùng gì.
  - Cho phép cấu hình preferences ở:
    - Mức workflow.
    - Mức subscriber.

- Mỗi channel được nối với một hoặc nhiều **provider integrations**:
  - Email: SendGrid, SES, v.v.
  - SMS: Twilio, Nexmo, v.v.
  - Push: FCM, APNs, v.v.
  - In-app: Inbox component & feed.

- Push & chat có thể dùng **nhiều active integrations song song**, trong khi email/SMS có khái niệm primary.

### 2.2. Về luồng hoạt động với backend NestJS

- Luồng điển hình:
  1. Backend nhận sự kiện/domain event (order created, user signed up…).
  2. Backend mapping sự kiện → workflow key trên Novu.
  3. Backend gửi trigger tới Novu với:
     - Subscriber (id, email, phone, device token…).
     - Payload (data để render template).
  4. Novu thực thi workflow, gửi qua các channel tương ứng.
  5. Novu phát sinh các event trạng thái (delivered, seen…) → webhook back về backend.

- Best practice là sử dụng **queue (Redis + Bull/BullMQ)** ở backend:
  - API layer chỉ push job vào queue.
  - Worker xử lý job, gọi Novu.
  - Giúp tách biệt thời gian đáp ứng API và độ trễ của provider.

### 2.3. Về Redis trong hệ thống notification

- Redis phù hợp làm:
  - **Job queue** cho notification (Bull/BullMQ).
  - **Cache**:
    - Trạng thái notification tạm thời.
    - Rate limit / throttling.
    - Preferences thường xuyên truy cập.
  - **Pub/Sub** cho event nội bộ (không bắt buộc).

- Kết hợp với Novu:
  - Redis làm side-car cho backend, **không thay thế** vai trò orchestration của Novu.

---

## 3. Kiến trúc đề xuất (high-level)

### 3.1. Các thành phần

- **Backend NestJS**
  - Modules:
    - `notification` module chuyên trách gửi/nhận notification.
  - Tầng:
    - API layer (controllers).
    - Service layer (orchestrate use cases).
    - Integration layer (Novu client, Redis queue, Redis cache).

- **Novu**
  - Quản lý workflows, templates, subscribers, topics.
  - Kết nối tới channel providers.

- **Redis**
  - Queue cho job gửi notification.
  - Cache trạng thái & rate limit.

### 3.2. Luồng chuẩn

1. Domain event xảy ra (vd: order.created).
2. Service đẩy job vào Redis queue `notifications`.
3. Worker lấy job:
   - Lấy thông tin subscriber, build payload.
   - Gọi Novu trigger workflow phù hợp.
4. Novu gửi notification qua In-app/Email/SMS/Push.
5. Novu callback webhook → Backend cập nhật trạng thái log.

### 3.3. Hỗ trợ đa kênh (In-app, Email, SMS, Push/Mobile)

- In-app:
  - Novu cung cấp inbox feed và component frontend.
  - Backend có thể:
    - Sync log về DB.
    - Expose API in-app feed cho client.

- Email/SMS:
  - Dựa vào providers đã cấu hình trong Novu.

- Push/Mobile:
  - Subscriber có `channelSettings` với device tokens.
  - Workflow trên Novu có step Push.
  - App mobile nhận push và gọi lại backend đánh dấu “seen/read”.

---

## 4. Use cases đã xác định

1. **Xác nhận đăng ký tài khoản**
   - Kênh: Email + In-app.
   - Pattern:
     - API → Queue → Worker → Novu workflow `user-signup-confirmation`.

2. **OTP đăng nhập**
   - Kênh: SMS + (tuỳ chọn) Push.
   - Yêu cầu:
     - Độ trễ thấp, ưu tiên reliability.
   - Pattern:
     - High-priority queue, retry với backoff, logging chi tiết.

3. **Thông báo trạng thái đơn hàng**
   - Kênh: Email + In-app + Push (tuỳ trạng thái).
   - Có thể dùng topic-based nếu muốn broadcast cho nhiều bên liên quan.

4. **Cảnh báo hệ thống (on-call)**
   - Kênh: Email + SMS/Push cho admin/on-call.
   - Pattern:
     - Multi-channel fallback (Push trước, sau đó SMS nếu chưa acknowledge).

5. **Tương tác social (comment, like, mention)**
   - Kênh: In-app + Push.
   - Yêu cầu:
     - Thường xuyên, số lượng nhiều, cần rate limit & grouping (digest) nếu cần.

---

## 5. Kết luận & Hướng triển khai tiếp

- **Kết luận chính**
  - Novu phù hợp để đóng vai trò **notification platform** cho hệ thống NestJS.
  - Redis là mảnh ghép quan trọng để đảm bảo:
    - Bất đồng bộ.
    - Khả năng mở rộng.
    - Kiểm soát retry & rate limiting.
  - Kết hợp hai công cụ này cho phép:
    - Xây dựng luồng notification đa kênh.
    - Dễ dàng mở rộng thêm use case mà không tăng nhiều độ phức tạp trong backend.

- **Hướng triển khai tiếp**
  - Áp dụng kiến trúc & patterns trong:
    - `ARCHITECTURE.md` — để align tổng thể module `notification` hiện tại.
    - `Implement_Guide.md` — để từng bước tích hợp vào codebase.
    - `WORKFLOW_PATTERNS.md` — để thiết kế workflow cho từng use case cụ thể.


