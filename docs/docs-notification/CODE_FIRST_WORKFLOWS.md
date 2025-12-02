## Hướng Dẫn Cho Project Host: Dùng Code-First Workflows với `@novu/framework`

> File này dành cho **các dự án NestJS/NextJS import NotificationModule** và muốn dùng thêm code-first workflows.  
> Layer code-first **không nằm trong module core**, mà do project host wiring.

### 1. Kiến trúc tổng quan

- **NotificationModule (core)** – trong library này:
  - Dùng `@novu/api`.
  - Gửi notification theo `workflowId` (`sendNotification({ workflowId, to, payload, ... })`).
- **Workflows code-first** – trong project host:
  - Dùng `@novu/framework` (`workflow()`, `payloadSchema`, các `step.*`).
  - Được serve qua một endpoint (Next.js, NestJS, service riêng, ...).

Thư mục `workflows/` trong repo library **chỉ chứa ví dụ**, bạn copy sang project host khi cần.

---

### 2. Các workflow ví dụ và pattern tương ứng

Trong thư mục `workflows/` của library, hiện có:

- `order-confirmation.workflow.ts`  
  - Pattern: **Simple Single Channel (Email)**  
  - Tham chiếu: `docs/WORKFLOW_PATTERNS.md` mục 2.1.
- `comment-digest.workflow.ts`  
  - Pattern: **Digest Pattern (In-App + Daily Email Digest)**  
  - Tham chiếu: `docs/WORKFLOW_PATTERNS.md` mục 2.5.
- `critical-alert.workflow.ts`  
  - Pattern: **Fallback Chain (Push → Email → SMS)**  
  - Tham chiếu: `docs/WORKFLOW_PATTERNS.md` mục 2.6.

Bạn có thể mở file mẫu để xem chi tiết code và copy sang project host.

---

### 3. Cách import workflows vào project NestJS

Giả sử bạn có backend NestJS sử dụng NotificationModule:

1. Cài thêm packages:

```bash
npm install @novu/framework zod
```

2. Tạo thư mục workflows trong project host, copy các file ví dụ:

```text
src/
  notification/           # module core (copy từ library)
  workflows/
    order-confirmation.workflow.ts
    comment-digest.workflow.ts
    critical-alert.workflow.ts
```

3. (Tuỳ chọn) dùng `@novu/framework/nest` để expose endpoint cho Novu:

```ts
// src/workflows/workflows.module.ts (project host)
import { Module } from '@nestjs/common';
import { NovuModule } from '@novu/framework/nest';
import { orderConfirmationWorkflow } from './order-confirmation.workflow';
import { commentDigestWorkflow } from './comment-digest.workflow';
import { criticalAlertWorkflow } from './critical-alert.workflow';

@Module({
  imports: [
    NovuModule.register({
      apiPath: '/api/novu', // URL mà Novu sẽ gọi để thực thi workflows
      workflows: [
        orderConfirmationWorkflow,
        commentDigestWorkflow,
        criticalAlertWorkflow,
      ],
    }),
  ],
})
export class WorkflowsModule {}
```

4. Đăng ký `WorkflowsModule` vào `AppModule`:

```ts
// app.module.ts (project host)
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    NotificationModule.forRoot(),
    WorkflowsModule,
  ],
})
export class AppModule {}
```

5. Trên Novu Dashboard:
   - Cấu hình **Bridge URL** trỏ tới `/api/novu`.
   - Đảm bảo `workflowId` trong code (`order-confirmation`, `comment-digest`, `critical-alert`, ...) trùng với ID bạn dùng khi trigger.

---

### 4. Trigger workflows từ NotificationModule

Sau khi workflows đã được define & serve, bạn chỉ cần gọi `NotificationService` như bình thường:

```ts
// OrderService (project host)
await this.notificationService.sendNotification({
  to: {
    subscriberId: order.userId,
    email: order.userEmail,
  },
  workflowId: 'order-confirmation',
  payload: {
    orderNumber: order.number,
    totalAmount: order.totalFormatted,
  },
});
```

- Workflow code-first `order-confirmation` sẽ xử lý phần còn lại (render email, validate payload, ...).
- Module core **không cần biết** workflow được implement ra sao.

---

### 5. Best practices khi dùng code-first workflows

1. **Quản lý bằng Git**  
   - Đặt tất cả file trong `src/workflows/` của project host.
   - Review qua pull request (đặc biệt các thay đổi template & logic).

2. **Đặt tên rõ ràng & ổn định**  
   - Match với guideline trong `docs/WORKFLOW_PATTERNS.md` và `WORKFLOW_PATTERNS.md` (tên dễ hiểu, tránh `workflow1`, `email1`, ...).

3. **Payload schema chặt chẽ (zod)**  
   - Luôn define `payloadSchema` để bắt lỗi sớm.
   - Giữ schema backward compatible khi có thể.

4. **Tách rõ vai trò**  
   - Project host: định nghĩa & deploy workflows, routing HTTP, bảo mật.
   - NotificationModule: chỉ là abstraction gửi notification (trigger theo `workflowId`).

5. **Test workflows**  
   - Viết unit test nhỏ cho từng workflow (xem ví dụ ở `docs/WORKFLOW_PATTERNS.md` mục 5.4).

---

### 6. Kết luận

- Thư mục `workflows/` trong library là **“cookbook”** cho code-first workflows: bạn lấy pattern, copy sang project host, chỉnh theo nhu cầu.
- NotificationModule và workflows code-first được **tách layer rõ ràng**:
  - Core module dùng Novu API.
  - Workflows layer dùng Novu Framework và được wiring tại từng project cụ thể.\n


