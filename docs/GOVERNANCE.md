## Governance & Versioning cho Notification Workflows

> File này mô tả **quy tắc quản trị (governance)** và **chiến lược versioning** cho workflows, ở mức kiến trúc.  
> Hướng dẫn áp dụng cụ thể cho team product/backend nằm trong `docs/docs-notification/`.

### 1. Mục tiêu governance

- Đảm bảo workflows:
  - Thay đổi **có kiểm soát** (review, test, rollback).
  - Giữ **backward compatibility** với backend (payload, workflowId, channels).
- Rõ ràng về:
  - **Ai** được phép tạo/sửa/xoá workflows.
  - **Quy trình review** (PR, code review, test).
  - **Cách versioning** (khi có breaking change).

---

### 2. Roles & trách nhiệm (ví dụ)

- **Backend Engineers**:
  - Thiết kế & implement workflows quan trọng (code-first hoặc dashboard).
  - Đảm bảo payload schema, error handling, observability.
- **Product / Marketing**:
  - Chỉnh sửa nội dung (copy, layout) trong phạm vi cho phép.
  - Đề xuất workflows mới (campaigns, A/B tests).
- **Tech Lead / Architect**:
  - Phê duyệt các thay đổi có nguy cơ ảnh hưởng lớn (breaking payload, multi-tenant, compliance).
  - Định nghĩa conventions & policies (naming, versioning, constraints payload).

---

### 3. Quy trình thay đổi workflows

#### 3.1. Với workflows code-first

1. **Đề xuất**:
   - Tạo ticket mô tả:
     - Mục tiêu business.
     - Payload cần thêm/thay đổi.
     - Channels liên quan.
2. **Thực hiện thay đổi**:
   - Sửa file trong `workflows/` (project host, *không phải* trong library core).
   - Cập nhật payload schema (zod) tương ứng.
3. **Review & test**:
   - Pull Request:
     - Ít nhất 1 backend engineer + 1 reviewer liên quan (product/marketing nếu cần).
   - Test:
     - Unit test cho workflow logic.
     - Test manual trên env dev/stage với Novu Dashboard.
4. **Deploy & monitor**:
   - Deploy qua pipeline CI/CD.
   - Theo dõi metrics/logs (đã mô tả trong `OBSERVABILITY.md`).

#### 3.2. Với workflows trên Dashboard Novu

- Mỗi thay đổi template/logic cần:
  - Được ghi nhận trong ticket.
  - Được review (screen review + checklist payload).
  - Nếu thay đổi payload template nhưng **không đổi contract** (fields payload giống nhau), chỉ cần product/marketing + dev confirm.
  - Nếu thay đổi contract (thêm/bớt/đổi kiểu field), phải áp dụng cơ chế **versioning** (xem phần sau).

---

### 4. Versioning workflows

#### 4.1. Khi nào cần version mới?

Tạo version mới (ví dụ `order-confirmation-v2`) khi bạn có **breaking change**, như:

- Thay đổi payload bắt buộc:
  - Thêm field bắt buộc mới mà backend cũ không truyền.
  - Đổi tên field.
  - Đổi kiểu dữ liệu field.
- Đổi kênh quan trọng (ví dụ từ chỉ Email sang Email + SMS) có thể ảnh hưởng đến compliance/chi phí.

#### 4.2. Cách đặt tên version

Một số convention:

- `order-confirmation` → `order-confirmation-v2` → `order-confirmation-v3`
- `password-reset-email` → `password-reset-email-v2`

Best practices:

- Không “reuse” workflowId cũ cho version mới.
- Giữ version cũ chạy song song một thời gian (grace period).

#### 4.3. Migration flow

1. Tạo workflow mới (`*-v2`) trên Novu (code-first hoặc dashboard).
2. Cập nhật code backend:
   - Từng bounded context / use case chuyển dần từ `*-v1` sang `*-v2` (với feature flag hoặc config).
3. Khi chắc chắn tất cả caller đã dùng `v2`, đánh dấu `v1`:
   - Không còn được sử dụng (remove mapping từ backend).
   - (Tuỳ policy) archive / delete trên Novu.

---

### 5. Tách package nội bộ (core vs provider-specific)

Đề xuất trong tương lai:

- `@company/notification-core`:
  - Các DTO, interfaces, services chung (bất chấp provider).
  - Hiểu ở mức abstraction “Notification”, không gắn chặt vào Novu.
- `@company/notification-novu`:
  - Implementation của `NotificationProvider` bằng Novu.
  - Các adapter với Novu SDK (API, Framework).

Lợi ích:

- Dễ chuyển provider (nếu cần) mà không đụng tới các domain dùng NotificationModule.
- Cho phép viết test integration với provider giả (fake provider) thông qua interface.

---

### 6. Mối quan hệ với tài liệu cho project host

- File này (`docs/GOVERNANCE.md`) mang tính **policy & kiến trúc tổng thể**.
- Hướng dẫn cụ thể cho team backend khi import module (ví dụ:
  - Checklist khi tạo workflow mới.
  - Cách đặt tên & version workflow trong code base thực tế.
  - Template PR review cho thay đổi workflows.  
  ) sẽ nằm trong `docs/docs-notification/GOVERNANCE_USAGE.md`.


