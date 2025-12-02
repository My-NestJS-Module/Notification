## Observability cho Notification Module

> Mục tiêu: định nghĩa **metrics/logs/traces tối thiểu** cho hệ thống notification  
> (module core + tích hợp Novu), ở mức kiến trúc.

### 1. Mục tiêu observability

- Biết được:
  - Bao nhiêu notification đã được gửi theo workflow/channel.
  - Tỉ lệ lỗi theo workflow/channel.
  - Độ trễ từ lúc backend trigger đến khi provider/Novu báo delivered (nếu có webhook).
- Hỗ trợ:
  - Debug nhanh sự cố (provider lỗi, cấu hình sai, ...).
  - Xác định workflow “nặng”, tối ưu dần.

---

### 2. Metrics tối thiểu đề xuất

#### 2.1. Counters

- `notification_trigger_total{workflowId, channel, status}`  
  - Tăng mỗi lần `NotificationService.sendNotification()` được gọi và provider phản hồi.
  - `status`: `processed` / `error`.
- `notification_webhook_events_total{workflowId, channel, status, providerId}`  
  - Tăng mỗi lần nhận webhook từ Novu.
  - Giúp theo dõi lifecycle thực tế (DELIVERED/BOUNCED/OPENED/CLICKED,...).

#### 2.2. Histograms

- `notification_trigger_duration_seconds{workflowId}`  
  - Đo thời gian từ lúc backend gọi `sendNotification()` đến khi Novu API phản hồi.
- (Nếu dùng webhook) `notification_end_to_end_latency_seconds{workflowId, channel}`  
  - Đo độ trễ từ lúc trigger đến khi nhận webhook “delivered”.

---

### 3. Logging

#### 3.1. Điểm log quan trọng

- Khi trigger notification:
  - Level: `info` hoặc `debug`.
  - Fields:
    - `workflowId`, `subscriberId`, `tenantId?`, `transactionId?`.
- Khi Novu API lỗi:
  - Level: `error`.
  - Fields:
    - `workflowId`, `subscriberId`, `error.code`, `error.message`, `providerId?`.
- Khi nhận webhook:
  - Level: `info` (hoặc `debug` nếu nhiều).
  - Fields:
    - `event.id`, `workflowId`, `stepId`, `channel`, `status`, `subscriberId`, `provider.id`.

#### 3.2. Format log

- Khuyến nghị log **JSON structured** để dễ ingest vào:
  - ELK / Loki / Datadog / New Relic / ...  
  Ví dụ:

```json
{
  "ts": "2025-01-16T10:00:00.000Z",
  "level": "info",
  "msg": "Notification triggered",
  "workflowId": "order-confirmation",
  "subscriberId": "user-123",
  "tenantId": "tenantA",
  "transactionId": "txn-123"
}
```

---

### 4. Traces (nếu hệ thống đã có tracing)

- Mỗi call `NotificationService.sendNotification()` nên:
  - Tạo span riêng (`notification.send`).
  - Gắn các attribute:
    - `notification.workflow_id`
    - `notification.subscriber_id`
    - `notification.tenant_id` (nếu có)
    - `notification.status` (processed/error)
- Khi nhận webhook:
  - Optionally, tiếp tục trace bằng cách:
    - Gắn `transactionId`/`externalId` vào span, cho phép correlate với span gửi ban đầu.

---

### 5. Vai trò của module core

- Module core:
  - Nên expose một vài hook/extension point để project host cắm metrics/logs/traces.
  - Không lock-in vào 1 tool cụ thể (Prometheus, Datadog,...).
- Observability implementation cụ thể:
  - Nằm ở project host:
    - Tận dụng logger/metrics client sẵn có.
    - Map các hook/callback từ module core sang hệ thống monitoring hiện tại.

Hướng dẫn chi tiết cho project host tích hợp observability sẽ nằm trong  
`docs/docs-notification/OBSERVABILITY_INTEGRATION.md`.


