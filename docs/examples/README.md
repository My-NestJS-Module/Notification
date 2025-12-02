# Mẫu Code cho Webhook Integration

Thư mục này chứa các file mẫu để project host tích hợp webhook từ Novu vào backend NestJS của họ.

## Các File Mẫu

### 1. `novu-webhook.controller.example.ts`

Mẫu controller xử lý webhook từ Novu.

**Cách sử dụng**:
1. Copy file này vào project của bạn (ví dụ: `src/notifications/novu-webhook.controller.ts`)
2. Tùy chỉnh:
   - Path endpoint (mặc định: `POST /internal/webhooks/novu`)
   - Guard/middleware cho security
   - Logging/metering
3. Register controller trong module của bạn

**Lưu ý**: Module core không tự tạo controller này để tránh coupling với routing/security của từng dự án.

### 2. `notification-status.service.example.ts`

Mẫu service xử lý webhook event và lưu vào database.

**Cách sử dụng**:
1. Copy file này vào project của bạn (ví dụ: `src/notifications/notification-status.service.ts`)
2. Implement `NotificationStatusIRepository` với ORM của bạn (xem `notification-log.entity.example.ts`)
3. Register repository và service trong module:

```typescript
@Module({
  providers: [
    NotificationLogRepository,
    {
      provide: 'NOTIFICATION_STATUS_REPOSITORY',
      useClass: NotificationLogRepository,
    },
    NotificationStatusService,
  ],
})
export class NotificationModule {}
```

4. Tùy chỉnh logic phát domain events (nếu cần)

### 3. `notification-log.entity.example.ts`

Mẫu entity/model cho bảng `notification_logs` với nhiều ORM khác nhau.

**Cách sử dụng**:
1. Chọn mẫu phù hợp với ORM của bạn:
   - TypeORM Entity
   - Prisma Schema
   - Mongoose Schema
   - SQL Migration (PostgreSQL)
2. Copy và tùy chỉnh theo nhu cầu
3. Tạo migration để tạo bảng trong database

## Workflow Tích Hợp

1. **Tạo Entity và Repository**:
   - Copy `notification-log.entity.example.ts` → tạo entity
   - Implement `NotificationStatusIRepository` interface

2. **Tạo Service**:
   - Copy `notification-status.service.example.ts` → tạo service
   - Inject repository đã implement

3. **Tạo Controller**:
   - Copy `novu-webhook.controller.example.ts` → tạo controller
   - Register trong module

4. **Cấu Hình Novu Dashboard**:
   - Bật Outbound Webhook
   - Đặt URL: `POST https://your-api.com/internal/webhooks/novu`
   - (Khuyến nghị) Cấu hình Secret để verify signature

## Tài Liệu Tham Khảo

- `docs/docs-notification/WEBHOOK_INTEGRATION.md`: Hướng dẫn tích hợp chi tiết
- `docs/ARCHITECTURE.md`: Section 10 về Webhook & Status Tracking
- `docs/Implement_Guide.md`: Section 3.5 về webhook

## Best Practices

- **Idempotency**: Sử dụng `externalId` (event.id) làm unique key
- **Security**: Verify webhook signature với Svix
- **Performance**: Trả `200 OK` sớm, xử lý async nếu cần
- **Error Handling**: Log lỗi nhưng không throw để tránh retry không cần thiết

