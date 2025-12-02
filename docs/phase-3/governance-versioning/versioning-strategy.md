## Workflow Versioning Strategy (Phase 3)

Tài liệu này chi tiết hoá phần **versioning** trong `docs/GOVERNANCE.md` với trọng tâm:
- Quy ước đặt tên.
- Khi nào cần tạo version mới.
- Cách vận hành song song v1/v2.

### 1. Mục tiêu

- Giảm tối đa rủi ro **breaking change** cho backend đã tích hợp NotificationModule.
- Cho phép:
  - **Triển khai v2** song song với v1.
  - Rollout dần bằng feature flag/config.
  - Rollback an toàn nếu có sự cố.

### 2. Quy ước đặt tên workflowId

#### 2.1. Base naming (không version)

Theo `docs/docs-notification/GOVERNANCE_USAGE.md`, một số ví dụ:

```ts
'order-confirmation'
'password-reset-email'
'payment-reminder-day-1'
```

Nguyên tắc:
- Tên mô tả rõ **use case**, không dùng alias kỹ thuật như `workflow1`, `email_test`.
- Sử dụng dấu gạch nối `-` để phân tách.

#### 2.2. Version suffix

Khi có **breaking change**, dùng hậu tố `-vN`:

- `order-confirmation` → `order-confirmation-v2` → `order-confirmation-v3`.
- `password-reset-email` → `password-reset-email-v2`.

Quy tắc:
- Không thay đổi `base` (phần trước `-vN`) nếu vẫn cùng business use case.
- Nếu chuyển sang use case khác hẳn, tạo base mới thay vì kéo dài version.

### 3. Khi nào phải tạo version mới?

Các trường hợp **bắt buộc** tạo version mới (`*-v2`):

- Payload breaking:
  - Thêm field **bắt buộc** mới mà backend cũ không truyền.
  - Đổi tên field đang được backend sử dụng.
  - Đổi kiểu dữ liệu của field (string → number, object → array, ...).
- Thay đổi channel gây ảnh hưởng lớn:
  - Thêm SMS/Push vào workflow vốn chỉ có Email nhưng billing/compliance nhạy cảm.
- Logic workflow thay đổi mạnh:
  - Thêm delay/digest có thể ảnh hưởng trải nghiệm kỳ vọng (ví dụ email xác nhận đơn hàng không còn gửi ngay lập tức).

Các trường hợp **không cần** version mới:

- Chỉ thay đổi copy/email content (chữ, icon, màu sắc) mà **payload contract giữ nguyên**.
- Thêm field payload **optional** mà template không đánh dấu là bắt buộc và backend có thể dần dần adopt.

### 4. Chiến lược vận hành v1/v2 (grace period)

Để giữ backward compatibility:

1. **Tạo workflow mới v2** trên Novu:
   - `order-confirmation-v2`.
2. **Cập nhật backend**:
   - Thêm mapping trong config (xem `client-migration-playbook.md`):
     - `NotificationWorkflows.ORDER_CONFIRMATION_V1`
     - `NotificationWorkflows.ORDER_CONFIRMATION_V2`
3. **Rollout dần**:
   - Dùng feature flag / config per bounded context:
     - Một số service dùng v2, số còn lại vẫn ở v1.
4. **Theo dõi**:
   - Sử dụng observability để so sánh KPI (error rate, bounce, CTR, ...).
5. **Sunset v1**:
   - Khi toàn bộ caller đã chuyển sang v2:
     - Xoá usage `ORDER_CONFIRMATION_V1` trong code.
     - (Tuỳ policy) archive/delete workflow v1 trên Novu.

### 5. Mapping với NotificationModule

NotificationModule làm việc với `workflowId: string`, nên:

- **Module core không chứa logic versioning**.  
- Versioning được:
  - Quản lý ở **project host** (config, feature flag).
  - Thể hiện trong **tài liệu governance** và **PR template**.

Ví dụ mapping (chi tiết hơn xem `client-migration-playbook.md`):

```ts
// notification-workflows.config.ts
export const NotificationWorkflows = {
  ORDER_CONFIRMATION_V1: 'order-confirmation',
  ORDER_CONFIRMATION_V2: 'order-confirmation-v2',
} as const;
```

### 6. Liên hệ tài liệu

- `docs/GOVERNANCE.md` – mục 4. Versioning workflows.  
- `docs/docs-notification/GOVERNANCE_USAGE.md` – mục 2, 3 (PR template + versioning trong code).  
- `docs/phase-3/governance-versioning/client-migration-playbook.md` – hướng dẫn chi tiết cách migrate caller.  


