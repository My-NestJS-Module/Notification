## Client Migration Playbook – Migrate sang Workflow Version Mới

Tài liệu này trả lời câu hỏi:  
**“Khi có `order-confirmation-v2`, làm sao migrate các backend đã dùng NotificationModule sang v2 một cách an toàn?”**

### 1. Nguyên tắc chung

- Mọi nơi gọi `NotificationService.sendNotification()` **không nên hard-code string workflowId**.
- Thay vào đó:
  - Dùng **config/mapping** tập trung (enum/const).
  - Cho phép **chuyển version** thông qua config/feature flag mà không sửa code domain nhiều lần.

### 2. Bước 1 – Chuẩn bị mapping workflow

Ví dụ trong project host:

```ts
// notification-workflows.config.ts
export const NotificationWorkflows = {
  ORDER_CONFIRMATION_V1: 'order-confirmation',
  ORDER_CONFIRMATION_V2: 'order-confirmation-v2',
} as const;

export type NotificationWorkflowKey = keyof typeof NotificationWorkflows;
```

### 3. Bước 2 – Chọn version qua feature flag/config

Có 2 cách điển hình:

#### 3.1. Feature flag (LaunchDarkly, Unleash, config service,…)

```ts
// order-notification.service.ts
const workflowId =
  this.featureFlags.useNewOrderEmail(user.tenantId)
    ? NotificationWorkflows.ORDER_CONFIRMATION_V2
    : NotificationWorkflows.ORDER_CONFIRMATION_V1;

await this.notificationService.sendNotification({
  to: { subscriberId: user.id, email: user.email },
  workflowId,
  payload: { /* ... */ },
});
```

#### 3.2. Static config / env-based

```ts
// order-notification.service.ts
const defaultWorkflowId =
  this.configService.get<'v1' | 'v2'>('ORDER_CONFIRMATION_VERSION') === 'v2'
    ? NotificationWorkflows.ORDER_CONFIRMATION_V2
    : NotificationWorkflows.ORDER_CONFIRMATION_V1;

await this.notificationService.sendNotification({
  to: { subscriberId: user.id, email: user.email },
  workflowId: defaultWorkflowId,
  payload: { /* ... */ },
});
```

### 4. Bước 3 – Rollout v2 theo từng nhóm

Gợi ý thứ tự rollout:

1. **Internal / QA users**:
   - Bật feature flag `useNewOrderEmail` cho nhóm QA/employee.
   - Verify nội dung + tracking (webhook, logs, metrics).
2. **Partial customer segments**:
   - Theo **tenant**, **region** hoặc **percentage rollout**.
   - Ví dụ: 10% traffic đầu dùng v2.
3. **Toàn bộ khách hàng**:
   - Khi KPIs ổn định, chuyển toàn bộ sang v2.

### 5. Bước 4 – Sunset v1

Khi chắc chắn:

- Không còn caller nào dùng `NotificationWorkflows.ORDER_CONFIRMATION_V1`.
- Observability cho thấy v2 ổn định.

Thực hiện:

1. Xoá/đánh dấu deprecated constant V1 trong code (hoặc giữ lại một thời gian nếu cần rollback nhanh).
2. Cập nhật tài liệu:
   - `docs/docs-notification/GOVERNANCE_USAGE.md` – ghi rõ hiện tại chỉ dùng `*-v2`.
3. (Tuỳ policy) trên Novu:
   - Archive hoặc delete workflow `order-confirmation` (v1).

### 6. Tương tác với NotificationModule

- Module chỉ cần:

```ts
await this.notificationService.sendNotification({
  to,
  workflowId,     // string đã được chọn theo chiến lược ở trên
  payload,
});
```

- Mọi logic:
  - Versioning.
  - Phân đoạn rollout.
  - Rollback.

… đều nằm ở **project host** và thể hiện qua config/mapping + feature flag, giúp module core giữ được tính ổn định và tái sử dụng.

### 7. Liên hệ tài liệu khác

- `docs/phase-3/governance-versioning/versioning-strategy.md` – định nghĩa khi nào phải tạo `*-v2`.  
- `docs/docs-notification/GOVERNANCE_USAGE.md` – ví dụ cụ thể PR template + mapping trong code.  


