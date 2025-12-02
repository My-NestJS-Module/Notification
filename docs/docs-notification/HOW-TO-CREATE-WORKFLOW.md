## Hướng Dẫn Tạo Workflow Code-First Mới

> Tài liệu này hướng dẫn từng bước tạo một workflow mới dùng `@novu/framework` + `zod`,  
> sử dụng các ví dụ trong thư mục `workflows/` của repo library.

### 1. Chuẩn bị

- Trong project host (NestJS/NextJS/Node), cài:

```bash
npm install @novu/framework zod
```

- Tạo thư mục cho workflows, ví dụ: `src/notification-workflows/`.

---

### 2. Bước 1 – Tạo file workflow mới

- Đặt tên file theo pattern: `<tên-pattern>.workflow.ts`.
- Ví dụ: `order-confirmation.workflow.ts`, `comment-digest.workflow.ts`, `critical-alert.workflow.ts`.
- Có thể copy một file mẫu trong thư mục `workflows/` của repo library và chỉnh sửa lại.

---

### 3. Bước 2 – Định nghĩa `payloadSchema` bằng `zod`

Ví dụ payload cho workflow xác nhận đơn hàng:

```ts
import { z } from 'zod';

export const OrderConfirmationPayloadSchema = z.object({
  orderNumber: z.string(),
  totalAmount: z.string(),
});

export type OrderConfirmationPayload = z.infer<
  typeof OrderConfirmationPayloadSchema
>;
```

- Nguyên tắc:
  - Luôn include các trường cần cho business.
  - Có thể thêm `tenantId`, `userId`, `segment` nếu cần cho multi-tenant/branching.

---

### 4. Bước 3 – Định nghĩa `workflowId` và hàm `workflow()`

Ví dụ (dựa trên file `workflows/order-confirmation.workflow.ts` trong repo này):

```ts
import { workflow } from '@novu/framework';
import { OrderConfirmationPayloadSchema } from './payloads';

export const orderConfirmationWorkflow = workflow(
  'order-confirmation',
  async ({ payload, step }) => {
    await step.email('send-confirmation', async () => ({
      subject: `Order Confirmation - ${payload.orderNumber}`,
      body: `
        <h1>Thank you for your order!</h1>
        <p>Order Number: ${payload.orderNumber}</p>
        <p>Total: ${payload.totalAmount}</p>
      `,
    }));
  },
  {
    payloadSchema: OrderConfirmationPayloadSchema,
  },
);
```

- `workflowId` (`'order-confirmation'`) là string:
  - Được sử dụng ở phía `NotificationModule` khi trigger.
  - Nên tuân theo quy ước versioning trong  
    `docs/code-first-workflows/GOVERNANCE-AND-OBSERVABILITY.md`.

---

### 5. Bước 4 – Định nghĩa các step & channels

Tuỳ pattern, bạn sẽ dùng các step khác nhau:

- `step.inApp(stepId, handler)`
- `step.email(stepId, handler, options?)`
- `step.sms(stepId, handler, options?)`
- `step.push(stepId, handler, options?)`
- `step.digest(stepId, handler)` cho Digest Pattern
- `step.run(stepId, handler)` cho logic tuỳ ý (ví dụ Rate Limiting)

Ví dụ Digest Pattern (tham khảo `workflows/comment-digest.workflow.ts`):

```ts
const digest = await step.digest('daily-digest', async () => ({
  // dùng cron hoặc unit/amount tuỳ docs version
  cron: '0 9 * * *', // ví dụ: mỗi 9h sáng
}));

await step.email(
  'daily-comment-digest',
  async () => ({
    subject: `Daily Comment Summary - ${digest.events.length} new comments`,
    body: `
      <h1>Daily Comment Summary</h1>
      <p>You have ${digest.events.length} new comments:</p>
      <ul>
        ${digest.events
          .map(
            (event) =>
              `<li>${event.payload.commenterName}: ${event.payload.comment}</li>`,
          )
          .join('')}
      </ul>
    `,
  }),
  {
    skip: () => digest.events.length === 0,
  },
);
```

---

### 6. Bước 5 – Export và gom workflows

- Tạo `index.ts` trong thư mục workflows của project host:

```ts
export * from './order-confirmation.workflow';
export * from './comment-digest.workflow';
export * from './critical-alert.workflow';
// ... thêm file mới ở đây
```

- File `index.ts` này sẽ được dùng để đưa vào `serve()` (Next.js) hoặc module bridge cho NestJS.

---

### 7. Bước 6 – Kết nối với NotificationModule

- Ở phía application/NestJS, khi muốn gửi notification:

```ts
await this.notificationService.sendNotification({
  workflowId: 'order-confirmation',
  to: { subscriberId: 'user-1' },
  payload: {
    orderNumber: 'ORD-123',
    totalAmount: '$100',
  },
  tenantId: 'tenant-a',
});
```

- Đảm bảo:
  - `workflowId` trùng với string trong file workflow.
  - `payload` khớp với `payloadSchema` (nếu không sẽ fail validation phía Novu).


