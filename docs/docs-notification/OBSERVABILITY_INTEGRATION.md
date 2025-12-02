## Hướng Dẫn Cho Project Host: Tích Hợp Observability Cho NotificationModule

> Đọc trước: `docs/OBSERVABILITY.md` để hiểu các metrics/logs/traces đề xuất.  
> File này tập trung vào **cách áp dụng trong dự án NestJS cụ thể** khi import NotificationModule.

---

### 1. Tích hợp metrics (Prometheus/Grafana hoặc tương đương)

Giả sử backend NestJS của bạn đã có sẵn một lớp metrics client (Prometheus, Datadog, ...):

1. Định nghĩa các metric:

```ts
// metrics/notification.metrics.ts (project host)
import { Counter, Histogram } from 'your-metrics-lib';

export const notificationTriggerTotal = new Counter({
  name: 'notification_trigger_total',
  help: 'Total number of notification triggers',
  labelNames: ['workflowId', 'channel', 'status'],
});

export const notificationTriggerDurationSeconds = new Histogram({
  name: 'notification_trigger_duration_seconds',
  help: 'Duration of notification trigger calls',
  labelNames: ['workflowId'],
});
```

2. Bọc `NotificationService` (hoặc viết decorator/interceptor) để bắn metrics:

```ts
// notification-metrics.service.ts (project host)
import { Injectable } from '@nestjs/common';
import { NotificationService } from '../notification/notification.service';
import { SendNotificationDto } from '../notification/dto';
import {
  notificationTriggerTotal,
  notificationTriggerDurationSeconds,
} from '../metrics/notification.metrics';

@Injectable()
export class NotificationMetricsService {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  async sendNotification(dto: SendNotificationDto) {
    const end = notificationTriggerDurationSeconds
      .labels(dto.workflowId)
      .startTimer();

    const result = await this.notificationService.sendNotification(dto);

    end();

    notificationTriggerTotal
      .labels(
        dto.workflowId,
        // channel có thể được encode trong workflowId hoặc payload, project host tự quyết
        'unknown',
        result.status,
      )
      .inc();

    return result;
  }
}
```

3. Trong domain service, inject `NotificationMetricsService` thay vì gọi trực tiếp `NotificationService` nếu bạn muốn luôn có metrics.

---

### 2. Tích hợp logs

Nếu backend của bạn đã có logger (NestJS Logger, Pino, Winston,...):

1. Log khi trigger:

```ts
// Ví dụ trong NotificationMetricsService hoặc wrapper tương đương
this.logger.log({
  msg: 'Notification triggered',
  workflowId: dto.workflowId,
  subscriberId: dto.to.subscriberId,
  status: result.status,
});
```

2. Log khi lỗi từ Novu:
   - Module core đã trả về `NotificationResult` với `status: 'error'` và `error.message/code` – bạn có thể log lại:

```ts
if (result.status === 'error') {
  this.logger.error({
    msg: 'Notification failed',
    workflowId: dto.workflowId,
    subscriberId: dto.to.subscriberId,
    error: result.error,
  });
}
```

3. Log webhook:

Trong `NotificationStatusService.handle(event)` (ở project host), log ở mức `info` hoặc `debug`:

```ts
this.logger.debug({
  msg: 'Novu webhook event received',
  id: event.id,
  workflowId: event.workflowId,
  status: event.status,
  channel: event.channel,
  subscriberId: event.subscriberId,
  providerId: event.provider?.id,
});
```

---

### 3. Tích hợp traces (nếu có OpenTelemetry/Jaeger, ... )

Nếu bạn đang dùng OpenTelemetry:

```ts
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('notification');

async sendNotification(dto: SendNotificationDto) {
  return tracer.startActiveSpan('notification.send', async (span) => {
    span.setAttribute('notification.workflow_id', dto.workflowId);
    span.setAttribute('notification.subscriber_id', dto.to.subscriberId);

    try {
      const result = await this.notificationService.sendNotification(dto);
      span.setAttribute('notification.status', result.status);
      return result;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: 'notification.send failed' }); // 2 = ERROR
      throw error;
    } finally {
      span.end();
    }
  });
}
```

Tương tự, bạn có thể tạo span khi xử lý webhook:

```ts
// Trong NotificationStatusService.handle(event)
tracer.startActiveSpan('notification.webhook.handle', (span) => {
  span.setAttribute('notification.workflow_id', event.workflowId ?? '');
  span.setAttribute('notification.channel', event.channel ?? '');
  span.setAttribute('notification.status', event.status ?? '');

  // handle + save log...

  span.end();
});
```

---

### 4. Checklist cho team tích hợp

Khi import NotificationModule và muốn có observability tốt, hãy kiểm tra:

- [ ] Đã bọc `NotificationService` (hoặc sử dụng dịch vụ wrapper) để bắn **metrics** trigger (`notification_trigger_total`, `notification_trigger_duration_seconds`...).  
- [ ] Đã log có cấu trúc cho:
  - Trigger thành công/thất bại.
  - Webhook events từ Novu.
- [ ] Nếu hệ thống có tracing:
  - Đã thêm span cho `notification.send`.
  - (Tuỳ chọn) span cho xử lý webhook.
- [ ] Đã có dashboard cơ bản:
  - Số lượng notification theo workflowId.
  - Error rate theo workflowId.
  - Độ trễ trung bình theo workflowId.
- [ ] Đã thiết lập alert đơn giản:
  - Error rate > X% trong Y phút cho workflows quan trọng.


