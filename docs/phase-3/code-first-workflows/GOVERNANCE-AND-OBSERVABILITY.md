## Governance, Versioning và Observability cho Code-First Workflows

### 1. Mục tiêu

- Đảm bảo workflows:
  - **Dễ truy vết** (ai gửi, workflow nào, cho tenant nào, ở version nào).
  - **Quản lý version rõ ràng**, tránh breaking change bất ngờ.
  - **Quan sát được** (log, metrics, tracing) trong môi trường multi-tenant/multi-env.

### 2. Quy Ước Đặt `workflowId`

- Đề xuất format:

```text
<domain>.<pattern>.<context?>.v<version>
```

- Ví dụ:
  - `comment-digest.v1`
  - `critical-alert.v1`
  - `notification-ab-testing.v1`
  - `notification-rate-limiting.v1`
  - `segment-conditional.v1`
- Nguyên tắc:
  - **Domain**: nhóm nghiệp vụ (comment, notification, order, billing, ...).
  - **Pattern**: tên pattern chính (digest, critical-alert, rate-limiting, ...).
  - **Version**: bắt buộc, bắt đầu từ `v1`.

### 3. Chiến Lược Versioning

- Khi thay đổi **không breaking**:
  - Giữ nguyên `workflowId`.
  - Thay đổi nhỏ như text, template, fields optional.
- Khi thay đổi **breaking**:
  - Tạo workflow mới với `workflowId` mới (ví dụ từ `*.v1` → `*.v2`).
  - Chạy song song `v1` và `v2` nếu cần thời gian migration.
  - Cập nhật `NotificationModule` để:
    - Hoặc chuyển hẳn sang `v2`.
    - Hoặc chọn version theo tenant/feature flag nếu cần.

### 4. Multi-Tenant / Multi-Env

- Multi-tenant được xử lý **tại Notification core**:
  - Mỗi `tenantId` có thể được map tới:
    - Một Novu project khác nhau.
    - Hoặc một environment khác nhau trong cùng project.
- Workflows nên:
  - Nhận `tenantId` trong payload (`payloadSchema`).
  - Dùng `tenantId` cho:
    - Logging, audit.
    - Branching logic nhẹ (ví dụ: tenant VIP vs thường).
- Không nên:
  - Embed logic mapping project/env vào chính workflows.

### 5. Observability (Logs, Metrics, Tracing)

#### 5.1. Logging

- Mỗi lần chạy workflow nên log các thông tin:
  - `workflowId`
  - `tenantId`
  - `subscriberId` (nếu có)
  - `channel` (email, sms, push, in-app, ...)
  - `stepId` (id của từng step: `send-confirmation`, `daily-comment-digest`, ...)
  - `status` (success, failed, skipped, rate-limited, ...)
- Logging có thể thực hiện:
  - Tại service code-first (NestJS/NextJS).
  - Tại Notification core khi trigger.

#### 5.2. Metrics

- Một số metrics gợi ý:
  - Số lượng workflow executions theo:
    - `workflowId`
    - `tenantId`
    - `channel`
  - Tỷ lệ lỗi (error rate).
  - Tỷ lệ bị limit (rate-limited).
- Có thể tích hợp với:
  - Prometheus / Grafana (xem thêm trong `research/prometheus/`).
  - Các APM khác (Datadog, New Relic, ...).

#### 5.3. Tracing

- Khi dùng OpenTelemetry:
  - Attach các attribute:
    - `notification.workflow_id`
    - `notification.tenant_id`
    - `notification.channel`
    - `notification.step_id`
  - Giúp dễ dàng truy vết từ request gốc → trigger notification → workflows steps.

### 6. Quy Trình Governance

- **Thiết kế & review**:
  - Mọi thay đổi workflows đi qua code review (PR).
  - Reviewer check:
    - Tên `workflowId` có đúng quy ước không.
    - Có log đầy đủ tenant/workflow/channel không.
    - Thay đổi có breaking hay không (cần bump version?).
- **Triển khai**:
  - Mỗi thay đổi workflows được gắn với một release/version backend.
  - Nếu cần rollback:
    - Có thể revert PR hoặc quay lại version workflow cũ (ví dụ dùng `*.v1` thay vì `*.v2`).


