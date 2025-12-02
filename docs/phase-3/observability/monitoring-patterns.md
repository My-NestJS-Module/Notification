## Monitoring Patterns & Stack Gợi Ý

### 1. Chọn Stack Metrics

| Stack | Khi nên dùng | Ghi chú triển khai |
| --- | --- | --- |
| Prometheus + Grafana | Hệ thống self-hosted, Kubernetes | Sử dụng `@willsoto/nestjs-prometheus` hoặc exporter tương đương; tạo recording rule cho error rate. |
| Datadog | SaaS giám sát toàn hệ thống | Map metric `notification_*` sang namespace riêng; tận dụng Dashboard template và Alert threshold builder. |
| New Relic | Doanh nghiệp đã chuẩn hoá New Relic One | Dùng Telemetry SDK để track Counter/Histogram tương tự Prometheus. |

### 2. Pattern tích hợp Prometheus

```ts
// notification-observability.module.ts
import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';
import { NotificationMetricsService } from './notification-metrics.service';

@Module({
  imports: [PrometheusModule.register()],
  providers: [NotificationMetricsService],
  exports: [NotificationMetricsService],
})
export class NotificationObservabilityModule {}
```

- `NotificationMetricsService` đóng vai trò wrapper, bắn Counter/Histogram ở `notification_trigger_total` và `notification_trigger_duration_seconds`.

### 3. Pattern tích hợp Datadog / New Relic

- Tạo service `MonitoringClient` (Datadog StatsD hoặc New Relic Telemetry).
- Map metric name giống Prometheus để share dashboard logic.
- Sử dụng tag/label `workflowId`, `channel`, `status` để lọc trên UI.

### 4. Log JSON Structured

#### 4.1. Khi trigger

```ts
this.logger.log({
  msg: 'notification.trigger',
  workflowId: dto.workflowId,
  subscriberId: dto.to.subscriberId,
  tenantId: dto.tenantId ?? null,
  payloadHash: hashPayload(dto.payload),
});
```

#### 4.2. Khi lỗi Novu API

```ts
this.logger.error({
  msg: 'notification.error',
  workflowId: dto.workflowId,
  subscriberId: dto.to.subscriberId,
  providerId: result.error?.providerId,
  code: result.error?.code,
  message: result.error?.message,
});
```

#### 4.3. Khi nhận webhook

```ts
this.logger.debug({
  msg: 'notification.webhook',
  eventId: event.id,
  workflowId: event.workflowId,
  channel: event.channel,
  status: event.status,
  providerId: event.provider?.id,
  occurredAt: event.occurredAt,
});
```

### 5. Webhook Verification & Latency

- Theo hướng dẫn chính thức *SendGrid Manual Configuration* (https://github.com/novuhq/docs/blob/main/content/docs/platform/integrations/email/activity-tracking/manual-configuration/sendgrid.mdx, truy cập 2025-12-02), luôn bật chữ ký webhook để chống giả mạo.
- Đo latency end-to-end:
  1. Lưu `triggeredAt` tại lúc gọi Novu.
  2. Khi nhận webhook, đọc `occurredAt` rồi tính `occurredAt - triggeredAt`.
  3. Push vào histogram `notification_end_to_end_latency_seconds`.

### 6. Dashboard mẫu

- Panel 1: `notification_trigger_total` stacked theo `workflowId`.
- Panel 2: Error rate (recording rule) + alert > 5%.
- Panel 3: `notification_end_to_end_latency_seconds` (P50/P95).
- Panel 4: Bảng webhook events theo `status` để debug nhanh provider.

