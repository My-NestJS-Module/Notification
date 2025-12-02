## Observability Overview

> Bộ tài liệu này gom toàn bộ hướng dẫn Phase 3 – Observability cho Notification Module. Đọc theo thứ tự gợi ý bên dưới để nhanh chóng triển khai.

- `metrics.md`: định nghĩa bộ metrics/logs đo được từ NotificationModule và webhook Novu.
- `monitoring-patterns.md`: đề xuất stack monitoring (Prometheus/Grafana, Datadog/New Relic) và pattern log JSON ở các điểm trigger / webhook.
- `checklist-architects.md`: checklist cho kiến trúc sư/lead nhằm đảm bảo đã expose metric, dashboard, alert đầy đủ.

**Liên quan**:
- `docs/OBSERVABILITY.md`: overview ở mức kiến trúc tổng thể.
- `docs/docs-notification/observability-guide.md`: pseudo-code để project host cắm vào stack hiện tại.
- `docs/docs-notification/observability-checklist.md`: checklist khi import module vào project mới.

