## Thư mục `workflows/` – Ví dụ Code-First Workflows với `@novu/framework`

> Đây là **thư mục ví dụ** trong repo library.  
> Khi áp dụng vào project thực tế, bạn copy các file cần thiết sang project host và wiring theo docs.

### 1. Mục tiêu

- Minh hoạ cách định nghĩa workflows code-first bằng `@novu/framework` + `zod`.
- Ánh xạ trực tiếp với các pattern trong:
  - `docs/WORKFLOW_PATTERNS.md`
  - `docs/code-first-workflows/WORKFLOW-PATTERNS-CODE-FIRST.md`

### 2. Danh sách workflows mẫu (7 workflows)

| File | Pattern | `workflowId` | Channels chính |
| --- | --- | --- | --- |
| `order-confirmation.workflow.ts` | Simple Single Channel (Email xác nhận đơn hàng) | `order-confirmation` | Email |
| `comment-digest.workflow.ts` | Digest Daily (In-App + Daily Email Digest) | `comment-digest` | In-App, Email |
| `comment-digest-weekly.workflow.ts` | Digest Weekly (In-App + Weekly Email Digest) | `comment-digest-weekly` | In-App, Email |
| `critical-alert.workflow.ts` | Fallback Chain (Push → Email → SMS) | `critical-alert` | Push, Email, SMS |
| `ab-testing.workflow.ts` | A/B Testing (Email variants) | `notification-ab-testing` | Email |
| `rate-limiting.workflow.ts` | Rate Limiting (giới hạn số lần gửi) | `notification-rate-limiting` | In-App (có thể mở rộng) |
| `conditional-branching.workflow.ts` | Conditional Branching (VIP vs Regular / Premium vs Free) | `segment-conditional` | In-App, Email, SMS |

> Các file này đóng vai trò **sample**. Khi triển khai thực tế, team copy file sang project host và chỉnh payload/channels cho phù hợp.

### 3. Cách sử dụng các file ví dụ này

1. Trong project NestJS/NextJS thực tế:
   - Cài đặt packages:

   ```bash
   npm install @novu/framework zod
   ```

2. Copy file workflow bạn cần từ thư mục `workflows/` này sang project host (ví dụ `src/notification-workflows/`).
3. Wiring với framework:
   - Nếu dùng Next.js: `serve({ workflows })` từ `@novu/framework/next`.
   - Nếu dùng NestJS: dùng module bridge tương ứng (ví dụ `NovuFrameworkModule.register({ apiPath, workflows })`) hoặc tự wrap `NovuRequestHandler`.
4. Trong backend, tiếp tục dùng `NotificationService.sendNotification()` với `workflowId` tương ứng (`order-confirmation`, `comment-digest`, `critical-alert`, ...).

### 4. Lưu ý kiến trúc

- **NotificationModule (core)** trong `src/notification`:
  - Chỉ phụ thuộc `@novu/api`.
  - Không import bất kỳ file nào trong `workflows/`.
- **Layer code-first workflows**:
  - Hoàn toàn optional.
  - Được wiring tại **project host**, không phải trong library này.

