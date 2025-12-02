## Checklist Cho Kiến Trúc Sư / Lead

| Hạng mục | Câu hỏi | Trạng thái |
| --- | --- | --- |
| Metrics | Đã expose `notification_trigger_total`, `notification_webhook_events_total`, `notification_trigger_duration_seconds`, `notification_end_to_end_latency_seconds` chưa? | [ ] |
| Error Rate | Đã có recording rule / monitor cho error rate per workflow? | [ ] |
| Latency | Đã lưu `triggeredAt` và correlate với `occurredAt` webhook để đo latency? | [ ] |
| Dashboard | Đã có dashboard tổng quan cho workflows quan trọng (volume, error, latency)? | [ ] |
| Alerting | Alert nào đang bảo vệ error rate cao hoặc webhook failure? Ngưỡng bao nhiêu? | [ ] |
| Logs | Tất cả điểm trigger / lỗi / webhook đã log JSON với workflowId, subscriberId, providerId chưa? | [ ] |
| Traces | (Nếu hệ thống có tracing) Đã tạo span `notification.send` và `notification.webhook.handle` chưa? | [ ] |
| Bảo mật webhook | Đã bật chữ ký webhook cho mọi provider chưa? Tham khảo hướng dẫn Novu (SendGrid, Resend, Mailgun) tại https://github.com/novuhq/docs/tree/main/content/docs/platform/integrations/email/activity-tracking (truy cập 2025-12-02). | [ ] |
| Quy trình sự cố | Khi error rate tăng, ai chịu trách nhiệm? có runbook? | [ ] |
| Module hooks | Project host đã biết cách hook `trackMetric()` / `trackEvent()` từ tài liệu `docs/docs-notification/observability-guide.md` chưa? | [ ] |

