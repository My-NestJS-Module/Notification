## Hướng Dẫn Tích Hợp Code-First Workflows với NestJS

> Tài liệu này là bản HOW-TO (bước-by-bước) cho hai kịch bản đã mô tả trong  
> `docs/code-first-workflows/NESTJS-INTEGRATION-SCENARIOS-ARCH.md`.

### 1. Chuẩn bị

- Đảm bảo project NestJS đã tích hợp `NotificationModule` (core) từ repo này.
- Cài thêm packages cần cho code-first:

```bash
npm install @novu/framework zod
```

---

### 2. Scenario 1 – Serve Workflows trực tiếp trong Backend NestJS

#### 2.1. Tổ chức thư mục

Ví dụ:

```text
src/
  notification/                 # Module core, copy từ library
  notification-workflows/       # Workflows code-first
    index.ts
    order-confirmation.workflow.ts
    comment-digest.workflow.ts
    critical-alert.workflow.ts
    ...
  notification-workflows.module.ts
  app.module.ts
```

Copy các file workflow mẫu từ thư mục `workflows/` của repo library này sang `src/notification-workflows/`.

#### 2.2. Đăng ký module workflows (NestJS)

Tại thời điểm viết tài liệu (theo docs Novu Framework, `Novu Framework – Getting Started`, `https://docs.novu.co/framework/getting-started`, truy cập 2024-09), cách wiring cụ thể cho NestJS có thể thay đổi theo version. Một pattern tổng quát:

- Tạo module mới để tập trung tất cả workflows:

```ts
// src/notification-workflows/index.ts
export * from './order-confirmation.workflow';
export * from './comment-digest.workflow';
export * from './comment-digest-weekly.workflow';
export * from './critical-alert.workflow';
export * from './ab-testing.workflow';
export * from './rate-limiting.workflow';
export * from './conditional-branching.workflow';
```

Sau đó, tuỳ theo gói bridge NestJS mà team sử dụng (ví dụ: một module `NovuFrameworkModule` do team tự wrap dựa trên `NovuRequestHandler` trong docs `https://github.com/novuhq/docs`), module có dạng:

```ts
// src/notification-workflows/notification-workflows.module.ts
import { Module } from '@nestjs/common';
// import { NovuFrameworkModule } from '@novu/framework/nest'; // ví dụ nếu tồn tại
import {
  orderConfirmationWorkflow,
  commentDigestWorkflow,
  commentDigestWeeklyWorkflow,
  criticalAlertWorkflow,
  abTestingWorkflow,
  rateLimitingWorkflow,
  conditionalBranchingWorkflow,
} from './index';

@Module({
  imports: [
    // Ví dụ minh hoạ, tuỳ vào implementation thật của team:
    // NovuFrameworkModule.register({
    //   apiPath: '/novu',
    //   workflows: [
    //     orderConfirmationWorkflow,
    //     commentDigestWorkflow,
    //     commentDigestWeeklyWorkflow,
    //     criticalAlertWorkflow,
    //     abTestingWorkflow,
    //     rateLimitingWorkflow,
    //     conditionalBranchingWorkflow,
    //   ],
    // }),
  ],
})
export class NotificationWorkflowsModule {}
```

- Cuối cùng import `NotificationWorkflowsModule` vào `AppModule`.

> Lưu ý: Tuỳ vào phiên bản `@novu/framework`, API tích hợp với NestJS có thể khác nhau.  
> Team nên tham khảo tài liệu cập nhật tại: `https://docs.novu.co/framework`.

---

### 3. Scenario 2 – Workflows ở Service riêng (Next.js/Node)

#### 3.1. Khi nào nên dùng?

- Khi muốn tách hoàn toàn notification workflows thành một service/platform riêng:
  - Backend NestJS tập trung vào business.
  - Service workflows có thể dùng Next.js/Node bất kỳ, chỉ cần hỗ trợ `@novu/framework`.

#### 3.2. Wiring cho Next.js (ví dụ)

Ví dụ đơn giản dựa trên snippet chính thức (Next.js route handler), tham khảo:  
`Configure Novu Framework Client with Next.js`, `https://github.com/novuhq/docs/blob/main/content/docs/framework/typescript/client.mdx` (truy cập 2024-09).

```ts
// app/api/novu/route.ts (Next.js)
import { Client as NovuFrameworkClient } from '@novu/framework';
import { serve } from '@novu/framework/next';
import {
  orderConfirmationWorkflow,
  commentDigestWorkflow,
  commentDigestWeeklyWorkflow,
  criticalAlertWorkflow,
  abTestingWorkflow,
  rateLimitingWorkflow,
  conditionalBranchingWorkflow,
} from '@/notification-workflows';

export const { GET, POST, OPTIONS } = serve({
  client: new NovuFrameworkClient({
    secretKey: process.env.NOVU_SECRET_KEY!,
    strictAuthentication: false,
  }),
  workflows: [
    orderConfirmationWorkflow,
    commentDigestWorkflow,
    commentDigestWeeklyWorkflow,
    criticalAlertWorkflow,
    abTestingWorkflow,
    rateLimitingWorkflow,
    conditionalBranchingWorkflow,
  ],
});
```

Backend NestJS lúc này:

- Chỉ cần giữ `NotificationModule` core.
- Khi cần gửi thông báo, vẫn gọi:

```ts
await this.notificationService.sendNotification({
  workflowId: 'critical-alert',
  to: { subscriberId: 'user-1' },
  payload: { title: 'High CPU usage', message: 'CPU > 90%' },
  tenantId: 'tenant-a',
});
```

Novu sẽ bridge sang service Next.js để thực thi workflows.

---

### 4. Nguyên tắc chung

- `NotificationModule`:
  - Không import bất kỳ workflow code-first nào.
  - Chỉ dùng `@novu/api` để trigger bằng `workflowId`.
- Workflows code-first:
  - Luôn được define ở project host (NestJS/Next.js/Node).
  - Phải đảm bảo `workflowId` trùng với string mà `NotificationModule` sử dụng.


