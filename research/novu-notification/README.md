---
title: Notification với NestJS + Novu + Redis — Tổng quan & Quick Start
---

## 1. Mục tiêu tài liệu

- Thiết kế & triển khai **hệ thống thông báo đa kênh** (In-app, Email, SMS, Push/Mobile) cho backend NestJS.
- Tận dụng **Novu** làm notification orchestrator + templates, và **Redis** cho queue/cache.
- Hỗ trợ 4 cấp độ người đọc:
  - **Junior**: Hiểu luồng cơ bản, gửi được notification đơn giản.
  - **Middle**: Biết dùng Redis queue, tách luồng gửi khỏi API.
  - **Senior**: Thiết kế đa kênh, webhook, in-app feed, push/mobile.
  - **Principal**: Nhìn nhận notification như một nền tảng (platform) ở scale lớn.

## 2. Nội dung tài liệu

- `ARCHITECTURE.md`
  - Kiến trúc tổng quan, các thành phần chính (NestJS, Novu, Redis).
  - Luồng hoạt động chi tiết Backend ↔ Novu ↔ Redis ↔ Client.
  - 5 use case thực tế (signup, OTP, order status, system alert, social activity).

- `Implement_Guide.md`
  - Hướng dẫn implement step-by-step:
    - Junior: Gửi notification đơn giản từ NestJS tới Novu.
    - Middle: Thêm Redis queue, worker, retry.
    - Senior: Đa kênh (In-app, Email, SMS, Push), webhook, in-app feed.
    - Principal: Provider abstraction, bounded context, multi-tenant.

- `WORKFLOW_PATTERNS.md`
  - Các workflow patterns:
    - Đơn kênh, đa kênh, queue-based, retry, idempotency.
    - Multi-channel fallback, topic-based, A/B testing.
  - Best practices theo cấp độ.

- `RESEARCH_SUMMARY.md`
  - Tóm tắt nguồn tài liệu đã tham khảo.
  - Kết luận chính & kiến trúc đề xuất.
  - Liệt kê use cases & pattern quan trọng.

## 3. Quick Start (Junior)

1. **Đăng ký Novu & tạo workflow**
   - Tạo project trên Novu.
   - Tạo workflow `test-notification` với kênh Email hoặc In-app.

2. **Cấu hình env cho NestJS**

```bash
NOVU_API_KEY=your_novu_api_key
NOVU_API_URL=https://api.novu.co
REDIS_HOST=localhost
REDIS_PORT=6379
```

3. **Tích hợp module notification**
   - Xem phần Junior trong `Implement_Guide.md` để:
     - Tạo `NovuProvider`.
     - Tạo `NotificationService`.
     - Gửi thử 1 notification.

4. **Nâng cấp dần**
   - Khi cần xử lý nhiều traffic hơn:
     - Thêm Redis queue (Middle).
   - Khi cần đa kênh & mobile:
     - Triển khai In-app + SMS + Push (Senior).
   - Khi hệ thống nhiều team, nhiều sản phẩm:
     - Thiết kế thành Notification Platform (Principal).

## 4. Đối tượng sử dụng

- **Backend engineers** đang xây dựng hệ thống thông báo trên NestJS.
- **Tech lead/architect** muốn chuẩn hoá kiến trúc notification và lựa chọn pattern phù hợp.
- **Product team** cần hiểu khả năng của nền tảng notification để thiết kế use case.


