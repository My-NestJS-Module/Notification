## Bộ Metrics & Logs Tối Thiểu

### 1. Counters

| Tên | Nhãn | Khi nào tăng | Ghi chú |
| --- | --- | --- | --- |
| `notification_trigger_total` | `workflowId`, `channel`, `status` | Mỗi lần `NotificationService.sendNotification()` hoàn tất | `status = processed | error`. Giữ đồng bộ với hook trả về từ Novu provider. |
| `notification_webhook_events_total` | `workflowId`, `channel`, `status`, `providerId` | Khi nhận webhook từ Novu | Cho phép đối chiếu lifecycle thực tế (DELIVERED/BOUNCED/OPENED/CLICKED, …). |

Nguồn dữ liệu webhook được mô tả trong tài liệu chính thức của Novu – *Email Activity Tracking* (https://github.com/novuhq/docs/blob/main/content/docs/platform/integrations/email/activity-tracking/index.mdx, truy cập 2025-12-02).

### 2. Histograms

- `notification_trigger_duration_seconds{workflowId}`  
  - Đo thời gian từ lúc gọi Novu API tới khi phản hồi.
- `notification_end_to_end_latency_seconds{workflowId, channel}`  
  - Tính từ lúc backend trigger đến khi webhook báo delivered.  
  - Lấy timestamp trigger từ audit log nội bộ + `occurredAt` trong payload webhook (xem “Webhooks” – https://github.com/novuhq/docs/blob/main/content/docs/platform/additional-resources/webhooks.mdx, truy cập 2025-12-02).

### 3. Error Rate

- Công thức gợi ý:  
  `error_rate = notification_trigger_total{status="error"} / notification_trigger_total{status="processed", status="error"}`  
- Expose metric này bằng cách sử dụng recording rule hoặc query trên Dashboard.  
- Alert threshold đề xuất: error rate > 5% trong 5 phút cho workflow quan trọng.

### 4. Logging JSON Structured

| Điểm log | Mức | Payload tối thiểu |
| --- | --- | --- |
| Trigger | `info`/`debug` | `workflowId`, `subscriberId`, `tenantId?`, `transactionId`, `payloadSize` |
| Lỗi Novu API | `error` | Trên + `error.code`, `error.message`, `providerId` |
| Webhook | `info`/`debug` | `eventId`, `workflowId`, `channel`, `status`, `provider.id`, `occurredAt`, `latencyMs` |

Ghi log dạng JSON để ingest vào ELK/Loki/Datadog/New Relic. Mẫu:

```json
{
  "ts": "2025-12-02T00:00:00.000Z",
  "level": "info",
  "msg": "Notification triggered",
  "workflowId": "order-confirmation",
  "subscriberId": "user-123",
  "transactionId": "txn-123",
  "channel": "email"
}
```

### 5. Traces (Tuỳ chọn)

- Span `notification.send` ở layer gọi `NotificationService`.
- Attribute bắt buộc:
  - `notification.workflow_id`
  - `notification.subscriber_id`
  - `notification.status`
- Span `notification.webhook.handle` khi xử lý webhook; correlate bằng `transactionId` hoặc `externalId`.

