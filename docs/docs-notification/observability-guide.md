## Observability Guide Cho Project Host

> Mục tiêu: cung cấp pseudo-code `trackMetric()` / `trackEvent()` để bạn copy và nối với stack monitoring sẵn có (Prometheus, Datadog, New Relic,…).

### 1. Cấu trúc gợi ý

```
docs/
└─ docs-notification/
   └─ observability-guide.md (file này)
src/
└─ monitoring/
   ├─ monitoring.module.ts
   ├─ metric.registry.ts
   └─ monitoring.client.ts
```

### 2. Pseudo-code `trackMetric`

```ts
// monitoring/metric.registry.ts
export type MetricLabelMap = Record<string, string | number | undefined>;

export interface MetricClient {
  counter: (name: string, labels?: MetricLabelMap) => void;
  histogram: (name: string, value: number, labels?: MetricLabelMap) => void;
}

export class PrometheusMetricClient implements MetricClient {
  constructor(private readonly registry: Registry) {}

  counter(name: string, labels?: MetricLabelMap) {
    this.registry.getSingleMetric(name).inc(labels as any);
  }

  histogram(name: string, value: number, labels?: MetricLabelMap) {
    this.registry.getSingleMetric(name).observe(labels as any, value);
  }
}
```

```ts
// monitoring/monitoring.client.ts
export class MonitoringClient {
  constructor(private readonly metricClient: MetricClient) {}

  trackMetric(name: string, value: number | null, labels?: MetricLabelMap) {
    if (value === null) {
      this.metricClient.counter(name, labels);
      return;
    }
    this.metricClient.histogram(name, value, labels);
  }
}
```

### 3. Pseudo-code `trackEvent`

```ts
// monitoring/monitoring.client.ts
export interface MonitoringEventPayload {
  msg: string;
  workflowId: string;
  subscriberId?: string;
  status?: string;
  providerId?: string;
  extra?: Record<string, unknown>;
}

export class MonitoringClient {
  // ...
  trackEvent(payload: MonitoringEventPayload) {
    this.logger.log({
      ...payload,
      ts: new Date().toISOString(),
      source: 'notification-module',
    });
  }
}
```

### 4. Wiring vào NotificationModule

```ts
// notification/notification.module.ts (project host)
@Module({
  imports: [MonitoringModule, NotificationCoreModule],
  providers: [
    {
      provide: NOTIFICATION_OBSERVABILITY_HOOK,
      useFactory: (monitoringClient: MonitoringClient) => ({
        trackMetric: monitoringClient.trackMetric.bind(monitoringClient),
        trackEvent: monitoringClient.trackEvent.bind(monitoringClient),
      }),
      inject: [MonitoringClient],
    },
  ],
})
export class NotificationModule {}
```

### 5. Sử dụng trong service

```ts
export class NotificationMetricsService {
  constructor(
    private readonly notificationService: NotificationService,
    @Inject(NOTIFICATION_OBSERVABILITY_HOOK)
    private readonly observability: ObservabilityHook,
  ) {}

  async sendNotification(dto: SendNotificationDto) {
    const start = Date.now();
    try {
      const result = await this.notificationService.sendNotification(dto);

      this.observability.trackMetric('notification_trigger_total', null, {
        workflowId: dto.workflowId,
        channel: dto.channel ?? 'unknown',
        status: result.status,
      });

      this.observability.trackMetric(
        'notification_trigger_duration_seconds',
        (Date.now() - start) / 1000,
        { workflowId: dto.workflowId },
      );

      this.observability.trackEvent({
        msg: 'notification.trigger',
        workflowId: dto.workflowId,
        subscriberId: dto.to.subscriberId,
        status: result.status,
      });

      return result;
    } catch (error) {
      this.observability.trackEvent({
        msg: 'notification.error',
        workflowId: dto.workflowId,
        subscriberId: dto.to.subscriberId,
        status: 'error',
        extra: { error },
      });
      throw error;
    }
  }
}
```

### 6. Webhook handler

```ts
export class NotificationStatusService {
  constructor(
    @Inject(NOTIFICATION_OBSERVABILITY_HOOK)
    private readonly observability: ObservabilityHook,
  ) {}

  async handleWebhook(event: NovuWebhookEvent) {
    this.observability.trackMetric('notification_webhook_events_total', null, {
      workflowId: event.workflowId ?? 'unknown',
      channel: event.channel ?? 'unknown',
      status: event.status ?? 'unknown',
      providerId: event.provider?.id ?? 'novu',
    });

    this.observability.trackEvent({
      msg: 'notification.webhook',
      workflowId: event.workflowId ?? 'unknown',
      status: event.status,
      providerId: event.provider?.id,
      extra: { occurredAt: event.occurredAt },
    });
  }
}
```

### 7. Tip cấu hình

- Giữ tên metric đồng nhất với tài liệu `docs/observability/metrics.md`.
- Nếu dùng SaaS (Datadog/New Relic) hãy map tag theo `workflowId`, `channel`, `status`.
- Khi deploy nhiều tenant, thêm label `tenantId`.

