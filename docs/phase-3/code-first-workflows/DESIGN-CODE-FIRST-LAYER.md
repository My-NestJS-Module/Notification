## Thiết Kế Layer Code-First Workflows

### 1. Mục tiêu thiết kế

- **Tách biệt rõ ràng**:
  - `NotificationModule` (core) chỉ sử dụng `@novu/api`.
  - Layer code-first workflows chỉ sử dụng `@novu/framework` + `zod`.
- **Không ràng buộc project host**:
  - Repo này chỉ cung cấp **ví dụ & pattern**.
  - Layer code-first thực chiến được wiring tại **project host** (NestJS/NextJS/Node service).
- **Hỗ trợ multi-tenant/multi-env**:
  - Quyết định mapping tenant → Novu project/env nằm ở **Notification core**.
  - Workflows chỉ nhận `tenantId`, `segment`, metadata… như một phần payload.

### 2. Tách lớp giữa Core vs Code-First

#### 2.1. NotificationModule (core)

- Sống trong `src/notification/`.
- Chịu trách nhiệm:
  - Cấu hình `@novu/api` client (API key, serverURL, appId…).
  - Mapping tenant → Novu project/env (multi-tenant).
  - Expose facade: `NotificationService.sendNotification({ workflowId, to, payload, tenantId, ... })`.
- **Không**:
  - Import bất kỳ loại workflow code-first nào.
  - Biết chi tiết steps, channels, logic nội bộ của workflows.

#### 2.2. Layer code-first workflows

- Sống trong thư mục `workflows/` ở repo này (sample) và được copy sang project host.
- Đặc điểm:
  - Được định nghĩa bằng `workflow()` từ `@novu/framework`.
  - Sử dụng `zod` để define `payloadSchema` & `controlSchema`.
  - Định nghĩa rõ ràng `workflowId`, `stepId`, channels.
- Không trực tiếp gọi `@novu/api`, không biết gì về API key hay multi-tenant config.

### 3. Luồng dữ liệu tổng quát

Luồng đơn giản khi application gửi thông báo:

1. **Application** (service/domain) gọi `NotificationService.sendNotification()` với:
   - `workflowId` (ví dụ: `comment-digest`, `critical-alert`, `segment-conditional.v1`).
   - `tenantId`, `subscriberId`, `payload` (data nghiệp vụ).
2. **NotificationModule (core)**:
   - Dựa trên `tenantId` chọn đúng Novu project/env và API key.
   - Sử dụng `@novu/api` để trigger workflow tương ứng trên Novu.
3. **Novu Platform**:
   - Dựa trên `workflowId`, resolve định nghĩa workflow được serve từ một service code-first.
4. **Service code-first** (NestJS/NextJS/Node):
   - Được cấu hình với `@novu/framework`, expose endpoint (`/api/novu`, `/novu`, ...).
   - Chứa các workflow định nghĩa trong thư mục `workflows/`.
   - Thực thi các bước (step) và gửi thông báo qua các channels tương ứng.

### 4. Tổ chức thư mục workflows (sample trong repo)

Ở root repo library:

```text
workflows/
  README.md
  index.ts
  order-confirmation.workflow.ts
  comment-digest.workflow.ts
  comment-digest-weekly.workflow.ts
  critical-alert.workflow.ts
  ab-testing.workflow.ts
  rate-limiting.workflow.ts
  conditional-branching.workflow.ts
```

- Các file này:
  - Được dùng làm **ví dụ** cho project host.
  - Không được import ngược vào `src/notification`.
  - Được tham chiếu trong `WORKFLOW-PATTERNS-CODE-FIRST.md`.

### 5. Multi-Tenant / Multi-Env

- **Tenant → Novu project/env**:
  - Được cấu hình tại Notification core (ví dụ: trong `notification.config.ts`).
  - Mỗi tenant có thể được ánh xạ tới:
    - Một Novu project/environments khác nhau, hoặc
    - Một deployment workflows khác (service code-first khác).
- **Workflows chỉ cần biết**:
  - `tenantId` là một field trong `payload`, phục vụ:
    - Logging / audit trong step.
    - Branching logic (ví dụ: tenant VIP vs thường).

### 6. Versioning & Compatibility

- Mỗi workflow nên có `workflowId` rõ ràng, encode version, ví dụ:
  - `comment-digest.v1`
  - `critical-alert.v1`
  - `segment-conditional.v1`
- Khi thay đổi breaking:
  - Tạo workflow mới với `workflowId` `*.v2`.
  - Cho phép chạy song song `v1` và `v2` trong một thời gian chuyển tiếp.
- Cách quản lý version sẽ được mô tả chi tiết trong `GOVERNANCE-AND-OBSERVABILITY.md`.


