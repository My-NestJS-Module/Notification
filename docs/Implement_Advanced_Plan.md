## Plan Nâng Cao cho Notification Module (Phase 2/3)

### 1. Mục tiêu tổng quát

- Nâng cấp module notification hiện tại thành nền tảng có thể:
  - Nhận webhook trạng thái từ Novu và ghi log / phát domain events.
  - Hỗ trợ code-first workflows với `@novu/framework` và các workflow pattern nâng cao.
  - Hỗ trợ multi-tenant, multi-env ở mức kiến trúc.
  - Có observability tốt (metrics, logs, tracing) và cơ chế governance rõ ràng.

### 2. Phase 2 – Webhook, logging và tracking trạng thái

- Thiết kế endpoint webhook từ Novu về backend:
  - Controller: `NovuWebhookController` (ví dụ `POST /internal/webhooks/novu`).
  - DTO nội bộ `NovuWebhookEvent` như mô tả trong `ARCHITECTURE.md`.
  - Service `NotificationStatusService` để:
    - Map payload từ Novu → model nội bộ (notification_logs).
    - Lưu vào DB (bảng `notification_logs` hoặc tương đương).
    - (Tuỳ chọn) phát domain events (`NotificationDelivered`, `NotificationBounced`, …).
- Bổ sung schema DB gợi ý cho `notification_logs`:
  - Các cột: externalId, workflowId, stepId, channel, status, subscriberId, providerId, occurredAt, raw, metadata,...
- Bổ sung docs:
  - Hướng dẫn cấu hình outbound webhook trong Novu Dashboard (URL, secret/signature).
  - Ví dụ end-to-end: từ order email → provider → Novu → webhook → log.

### 3. Phase 2 – Mở rộng public API module cho webhook

- Module core vẫn là library, nhưng thêm:
  - Interfaces / DTO cho `NovuWebhookEvent` (không buộc dự án phải dùng).
  - Gợi ý `NotificationStatusService` (code mẫu, có thể copy vào project host).
  - Best practices xử lý webhook (idempotency, retry, bảo mật).

### 4. Phase 3 – Code-first workflows với `@novu/framework`

- Bổ sung layer code-first (vẫn tách khỏi module core để không bắt buộc):
  - Thư mục gợi ý `workflows/` chứa các file workflow TypeScript.
  - Sử dụng `workflow()` từ `@novu/framework` với `payloadSchema` (zod).
  - Implement các pattern nâng cao từ `WORKFLOW_PATTERNS.md`:
    - Digest, Fallback Chain, A/B Testing, Rate Limiting, Conditional Branching,...
- Kịch bản tích hợp với NestJS:
  - Dùng `NovuModule.register({ apiPath, workflows })` (theo docs chính thức).
  - Hoặc chỉ dùng code-first workflows rồi sync lên Novu qua CI.
- Docs bổ sung:
  - Cách tổ chức workflow code-first trong monorepo hoặc project riêng.
  - Mối quan hệ giữa workflow code-first và NotificationModule hiện tại (trigger bằng `workflowId`).

### 5. Phase 3 – Multi-tenant & Multi-env

- Thiết kế chiến lược multi-tenant:
  - Mapping `tenantId` → `workflowId` (ví dụ: `tenantA-order-confirmation`).
  - Hoặc tách per-tenant environment trong Novu (mỗi tenant một project / env).
- Mở rộng DTO (ở project host, không trong core) để:
  - Truyền `tenantId` (ví dụ `TenantAwareSendNotificationDto`).
  - Map sang workflow tương ứng thông qua policy hoặc mapping table.
- Chiến lược multi-env:
  - Mỗi env (dev/stage/prod) có cặp API key và server URL riêng.
  - Document hoá convention tên workflows giữa các env.

### 6. Phase 3 – Observability

- Thiết kế metrics tối thiểu cho notification:
  - Số notification sent theo workflowId và channel.
  - Error rate theo workflowId.
  - Latency từ trigger đến delivered (dựa trên webhook logs nếu có).
- Gợi ý tích hợp với:
  - Prometheus/Grafana hoặc Datadog/New Relic tuỳ stack.
  - Logging structured (JSON logs) cho các action: trigger, provider error, webhook event.
- Docs:
  - Checklist các metrics cần theo dõi.
  - Ví dụ code pseudo `trackMetric()` trong workflow hoặc module.

### 7. Phase 3 – Governance & versioning

- Định nghĩa quy trình quản lý lifecycle của workflows:
  - Ai được phép tạo/sửa/xoá workflow.
  - Cách review changes (PR + code review với code-first, hoặc review trên Dashboard).
  - Quy ước versioning workflow (ví dụ `order-confirmation-v2`).
- Đề xuất tách thành 2 package nội bộ:
  - `@company/notification-core`: abstraction + DTOs + service + provider interface.
  - `@company/notification-novu`: implementation dựa trên Novu (NovuProvider).
- Bổ sung phần “Governance” trong tài liệu kiến trúc:
  - Chính sách khi đổi template/fields (giữ backward compatibility với payload).

### 8. Roadmap tóm tắt

- **Phase 2** (ưu tiên trung hạn):
  - Webhook từ Novu → backend.
  - Logging notification status + domain events.
  - Cập nhật docs về observable flows.
- **Phase 3** (dài hạn):
  - Code-first workflows với `@novu/framework` và patterns nâng cao.
  - Multi-tenant, multi-env strategy.
  - Observability đầy đủ + governance & versioning.


