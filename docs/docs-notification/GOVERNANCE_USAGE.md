## Hướng Dẫn Cho Project Host: Áp Dụng Governance & Versioning Cho Workflows

> Đọc trước: `docs/GOVERNANCE.md` để nắm policy tổng thể.  
> File này tập trung vào **cách team backend/product áp dụng trong repo thực tế** khi dùng NotificationModule.

---

### 1. Checklist khi tạo workflow mới

1. Xác định **use case rõ ràng**:
   - Ví dụ: “Email xác nhận đơn hàng”, “SMS OTP”, “Daily comment digest”, ...
2. Chọn **tên workflowId** hợp lý:

```ts
// Good
'order-confirmation'
'password-reset-email'
'payment-reminder-day-1'

// Bad
'workflow1'
'email_test'
```

3. Xác định **payload schema**:
   - Liệt kê tất cả fields cần cho template.
   - Dùng `zod` để define schema (nếu code-first).
4. Quyết định **channels**:
   - Email / SMS / In-App / Push / Chat.

---

### 2. Template Pull Request cho thay đổi workflow

Khi thay đổi workflows (code-first hoặc Dashboard), PR nên trả lời rõ:

- **1. Workflow nào?**
  - `workflowId`: `order-confirmation` / `order-confirmation-v2` / ...
- **2. Thay đổi gì?**
  - Thêm/đổi/bớt channel?
  - Thêm/đổi/bớt field payload?
  - Thay đổi copy/template?
- **3. Có phải breaking change không?**
  - Nếu **có**:
    - Đã tạo `*-v2` chưa?
    - Kế hoạch migrate caller sang version mới?
  - Nếu **không**:
    - Xác nhận payload schema không đổi (chỉ đổi copy/UI).
- **4. Plan test / rollout**
  - Đã test ở env dev/stage?
  - Có feature flag / config để rollback nhanh không?

Bạn có thể tạo file `.github/PULL_REQUEST_TEMPLATE/workflow.md` trong project host dựa trên các câu hỏi trên.

---

### 3. Áp dụng versioning trong code

Giả sử bạn cần nâng cấp `order-confirmation`:

1. Tạo workflow mới trên Novu:
   - `order-confirmation-v2`.
2. Trong code backend (project host), dùng config/mapping:

```ts
// notification-workflows.config.ts
export const NotificationWorkflows = {
  ORDER_CONFIRMATION_V1: 'order-confirmation',
  ORDER_CONFIRMATION_V2: 'order-confirmation-v2',
} as const;
```

3. Từ domain service, chọn version:

```ts
const workflowId =
  featureFlags.useNewOrderEmail
    ? NotificationWorkflows.ORDER_CONFIRMATION_V2
    : NotificationWorkflows.ORDER_CONFIRMATION_V1;

await this.notificationService.sendNotification({
  to: { subscriberId: user.id, email: user.email },
  workflowId,
  payload: { /* ... */ },
});
```

4. Sau khi mọi caller chuyển sang `v2`:
   - Xoá dần usage của `v1`.
   - (Tuỳ policy) archive/delete workflow `v1` trên Novu.

---

### 4. Sử dụng NotificationModule trong bối cảnh governance

- NotificationModule **không ép** bạn phải dùng versioning theo kiểu nào – nó chỉ nhận `workflowId` string.
- Governance & versioning được áp dụng:
  - Ở **project host**:
    - Bằng config/mapping (`NotificationWorkflows`).
    - Bằng PR review template.
  - Ở **Novu Dashboard / code-first workflows**:
    - Bằng conventions đặt tên.
    - Bằng process review thay đổi workflows.

---

### 5. Tách core vs provider-specific trong monorepo (tuỳ chọn)

Nếu bạn tiến tới mức platform và muốn tách:

- `@company/notification-core`:
  - Đặt abstraction chung (DTOs, interfaces, services).
  - Không phụ thuộc Novu.
- `@company/notification-novu`:
  - Chứa implementation dựa trên Novu (provider, adapter).

Thì:

- Project host chỉ import:

```ts
import { NotificationModule } from '@company/notification-novu';
```

- Governance & versioning:
  - Được quản lý ở layer workflows (code-first / dashboard) + config mapping.
  - Core module ít bị động chạm hơn, dễ giữ ổn định lâu dài.

---

### 6. Tóm tắt cho team backend

- Xem `docs/GOVERNANCE.md` để hiểu policy tổng thể.
- Khi làm việc với workflows:
  - Luôn xác định rõ **contract payload** và **workflowId**.
  - Sử dụng versioning (`*-v2`) cho mọi breaking change.
  - Dùng PR template để đảm bảo thay đổi được review kỹ.
- NotificationModule là “công cụ”, governance nằm ở **cách bạn dùng nó** trong project host.\n


