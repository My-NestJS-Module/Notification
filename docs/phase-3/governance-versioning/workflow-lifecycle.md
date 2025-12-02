## Workflow Lifecycle & Governance Roles (Phase 3)

Tài liệu này chi tiết hoá phần **5.1 – Quy trình quản lý lifecycle của workflows**, mở rộng từ `docs/GOVERNANCE.md`.

### 1. Roles & quyền thao tác trên workflows

- **Backend Engineer**
  - Được phép:
    - Tạo workflows mới (code-first hoặc Novu Dashboard) cho các use case backend chịu trách nhiệm.
    - Sửa workflows khi cần thay đổi logic / payload / channels.
  - Không được phép:
    - Xoá vĩnh viễn workflows đang được dùng trong production nếu chưa có approval của Tech Lead/Architect.

- **Product / Marketing**
  - Được phép:
    - Điều chỉnh **copy, layout, branding** trong template (email/in-app/sms) khi **không thay đổi contract payload**.
  - Cần phối hợp với Backend khi:
    - Muốn thêm/bớt field hiển thị trong template → có thể ảnh hưởng payload/contract.

- **Tech Lead / Architect**
  - Được phép:
    - Phê duyệt mọi thay đổi có nguy cơ **breaking change** (thay đổi payload, versioning, multi-tenant, compliance).
    - Quyết định tạo version mới (`*-v2`) và kế hoạch migrate callers.
  - Chịu trách nhiệm:
    - Định nghĩa conventions (naming, versioning, payload constraints).
    - Đảm bảo workflows tuân thủ security/compliance (PII, opt-in/out).

### 2. Quy trình lifecycle cho workflows code-first

Lifecycle chuẩn (align với `docs/GOVERNANCE.md` + `docs/code-first-workflows/*`):

1. **Ideation & Ticket**
   - Tạo ticket mô tả:
     - Mục tiêu business & use case.
     - Loại workflow (order-confirmation, otp-sms, digest, critical-alert, ...).
     - Yêu cầu về payload (các field bắt buộc + optional).
     - Channels cần dùng.

2. **Design**
   - Backend + Product thống nhất:
     - `workflowId` (theo convention – xem `versioning-strategy.md`).
     - Payload schema (zod hoặc TypeScript DTO) cho code-first.
     - Quy tắc retry, delay, digest nếu cần.

3. **Implement (code-first workflows)**
   - Thực hiện trong repo host:
     - Tạo/ cập nhật file trong `workflows/` (code-first layer).
     - Ánh xạ rõ `workflowId` → logic & template.
     - Cập nhật schema payload.

4. **Review**
   - Tạo Pull Request:
     - Bắt buộc có: 1 Backend reviewer.
     - Tuỳ trường hợp: Product/Marketing review text + behaviour.
   - Checklist:
     - Payload schema có backward compatible không?
     - Có cần version mới `*-v2` không?
     - Đã cập nhật mapping `NotificationWorkflows`/config chưa (nếu dùng)?

5. **Test**
   - Unit test cho workflow logic (nếu code-first phức tạp).
   - Manual test trên environment dev/stage:
     - Trigger thử via backend hoặc tool.
     - Xác nhận nội dung & channels trên Novu Activity Feed.

6. **Deploy & Monitor**
   - Merge PR → pipeline deploy.
   - Theo dõi metrics/logs (tham chiếu `docs/OBSERVABILITY.md` và `docs/observability/*`).
   - Đảm bảo không có spike error/bounce bất thường sau rollout.

### 3. Quy trình lifecycle cho workflows trên Novu Dashboard

1. **Trước khi chỉnh sửa template/logic**
   - Tạo ticket (hoặc cập nhật ticket hiện có) mô tả:
     - Workflow nào (workflowId).
     - Mục đích thay đổi (copy, layout, thêm channel, ...).

2. **Phân loại thay đổi**
   - **Non-breaking (chỉ đổi copy/UI)**:
     - Payload contract **không đổi** (cùng tập field + kiểu).
     - Ví dụ:
       - Sửa câu chữ, thêm icon, đổi màu.
     - Quy trình:
       - Product/Marketing đề xuất và chỉnh sửa trên Dashboard.
       - Backend confirm nhanh (nếu cần) rằng payload không đổi.
   - **Potential breaking (thay đổi payload/logic)**:
     - Thêm field yêu cầu mới trong template.
     - Đổi tên field trong template.
     - Thêm channel mới có impact về cost/compliance.
     - Khi đó **bắt buộc xem xét versioning** (`*-v2`) – xem `versioning-strategy.md`.

3. **Review trên Dashboard**
   - Sử dụng screen review:
     - Chụp screenshot trước/sau nếu cần.
     - Product review trải nghiệm nội dung.
   - Backend cross-check:
     - Payload placeholder trong template khớp với schema hiện tại?
     - Có field nào mới mà backend chưa gửi không?

4. **Approve & Publish**
   - Sau khi review xong:
     - Đối với non-breaking: publish trực tiếp (theo policy).
     - Đối với breaking: đảm bảo workflow mới (v2) + mapping client đã được chuẩn bị.

### 4. Liên hệ với tài liệu khác

- Policy tổng thể: `docs/GOVERNANCE.md`.  
- Hướng dẫn áp dụng từ góc nhìn project host: `docs/docs-notification/GOVERNANCE_USAGE.md`.  
- Versioning chi tiết & migration: `docs/phase-3/governance-versioning/versioning-strategy.md` và `client-migration-playbook.md`.


