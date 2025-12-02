## Observability Checklist Cho Project Host

| Bước | Câu hỏi | Trạng thái |
| --- | --- | --- |
| Config | Đã import `MonitoringModule` (hoặc client tương đương) trước khi khởi tạo `NotificationModule` chưa? | [ ] |
| Hook | Đã bind `trackMetric` & `trackEvent` vào token `NOTIFICATION_OBSERVABILITY_HOOK`? | [ ] |
| Metrics | Metric client có hỗ trợ nhãn `workflowId`, `channel`, `status`, `providerId` chưa? | [ ] |
| Logging | Logger có hỗ trợ JSON structured? đã set default fields (`service=notification-module`)? | [ ] |
| Webhook | `NotificationStatusService` đã gọi `trackMetric('notification_webhook_events_total')` mỗi event chưa? | [ ] |
| Latency | Có lưu `triggeredAt` khi call `sendNotification()` để correlate với `occurredAt` webhook? | [ ] |
| Dashboard | Đã clone dashboard template (volume, error rate, latency) và nối tới metric vừa expose? | [ ] |
| Alert | Đã tạo alert error rate > X% và alert webhook failure (không nhận event trong Y phút)? | [ ] |
| Runbook | Có link runbook xử lý sự cố observability bên trong portal nội bộ? | [ ] |
| Kiểm thử | Đã trigger workflow giả lập + kiểm tra metric/log xuất hiện trong stack monitoring chưa? | [ ] |

