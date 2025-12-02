## Tổng Quan Code-First Workflows với `@novu/framework`

### 1. Mục tiêu

- Cung cấp cái nhìn tổng quan cho team sử dụng module notification:
  - Module core (`NotificationModule`) chỉ dùng `@novu/api`.
  - Code-first workflows dùng `@novu/framework` nằm ở project host.
- Giải thích:
  - Tổ chức thư mục `workflows/` trong project host.
  - Cách `workflowId` được sử dụng giữa NotificationModule và workflows.

### 2. Vai trò của NotificationModule (core)

- Được copy từ thư mục `src/notification` trong repo này sang project NestJS.
- Chịu trách nhiệm:
  - Cấu hình `@novu/api` client (API key, serverURL, env).
  - Mapping tenant → Novu project/env (xem thêm `docs/MULTI_TENANCY.md`, `docs/docs-notification/MULTI_TENANT_INTEGRATION.md`).
  - Expose service đơn giản để gửi thông báo, ví dụ:
    - `NotificationService.sendNotification({ workflowId, to, payload, tenantId, ... })`.
- Không giữ logic steps, channels chi tiết – tất cả nằm trong workflows.

### 3. Vai trò của Code-First Workflows

- Được định nghĩa bằng `workflow()` từ `@novu/framework` tại project host:
  - Có thể là backend NestJS.
  - Hoặc một service khác (Next.js/Node) chỉ chuyên serve workflows.
- Mỗi workflow:
  - Có `workflowId` rõ ràng (ví dụ: `comment-digest`, `critical-alert`, `notification-ab-testing`, ...).
  - Định nghĩa `payloadSchema` (zod), channels (In-App, Email, SMS, Push, ...), `stepId`.
- Thư mục `workflows/` trong repo này chỉ là **ví dụ**:
  - Team copy file cần thiết sang project host.
  - Điều chỉnh payload/channels/logic theo business thực tế.

### 4. Tổ chức thư mục trong project host (gợi ý)

Ví dụ cấu trúc cho một project NestJS:

```text
apps/api/
  src/
    notification/                # Module core (copy từ repo library)
      notification.module.ts
      notification.service.ts
      ...
    notification-workflows/      # Thư mục workflows code-first
      index.ts
      order-confirmation.workflow.ts
      comment-digest.workflow.ts
      critical-alert.workflow.ts
      ...
    app.module.ts
```

- `notification/`:
  - Không phụ thuộc `@novu/framework`.
  - Chỉ dùng `@novu/api`.
- `notification-workflows/`:
  - Import `workflow()` và `step.*` từ `@novu/framework`.
  - Được wiring vào runtime tuỳ theo framework host (NestJS, Next.js, ...).

### 5. Mối liên kết qua `workflowId`

- Application → gọi `NotificationService` với `workflowId`:

```ts
await this.notificationService.sendNotification({
  workflowId: 'critical-alert',
  to: { subscriberId: 'user-1' },
  payload: {
    title: 'High CPU usage',
    message: 'CPU > 90% for 5 minutes',
  },
  tenantId: 'tenant-a',
});
```

- `NotificationModule`:
  - Sử dụng `@novu/api` để trigger workflow tương ứng trên Novu.
- Service code-first:
  - Định nghĩa workflow với cùng `workflowId: 'critical-alert'`.
  - Thực thi logic Fallback Chain (Push → Email → SMS).

### 6. Đọc thêm

- Thiết kế kiến trúc layer code-first:  
  - `docs/code-first-workflows/DESIGN-CODE-FIRST-LAYER.md`
- Các pattern workflows code-first:  
  - `docs/code-first-workflows/WORKFLOW-PATTERNS-CODE-FIRST.md`
- Hướng dẫn step-by-step:
  - `docs/docs-notification/HOW-TO-CREATE-WORKFLOW.md`
  - `docs/docs-notification/NESTJS-INTEGRATION-SCENARIOS.md`
  - `docs/docs-notification/HOW-TO-DEPLOY-WORKFLOWS.md`


