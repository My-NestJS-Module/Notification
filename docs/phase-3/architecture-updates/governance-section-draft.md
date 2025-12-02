## Bản nháp – Mục “Governance & Versioning” cho ARCHITECTURE.md

> File này là bản nháp nội dung sẽ được (hoặc đã được) chèn vào `docs/ARCHITECTURE.md`.  
> Mục tiêu: giúp người đọc kiến trúc hiểu **module này vận hành trong bối cảnh governance & versioning** như thế nào.

### 1. Vị trí đề xuất trong ARCHITECTURE.md

- Sau phần `## Kiến Trúc Module` hoặc trước `## Các Phụ Thuộc`, thêm mục:
  - `## Governance & Versioning (Phase 3)`

### 2. Nội dung gợi ý cho mục mới

**Tiêu đề**:

```md
## Governance & Versioning (Phase 3)
```

**Nội dung** (tóm tắt):

1. **Phạm vi**  
   Module Notification được thiết kế để dùng lại cho nhiều backend NestJS khác nhau.  
   Để tránh việc thay đổi workflows phá vỡ các tích hợp hiện có, ta áp dụng layer governance & versioning:

   - Ở **mức kiến trúc**: `docs/GOVERNANCE.md` định nghĩa policy tổng thể (roles, lifecycle, versioning).
   - Ở **mức hướng dẫn team host**: `docs/docs-notification/GOVERNANCE_USAGE.md` mô tả cách tích hợp mapping & PR template.
   - Ở **mức chi tiết Phase 3**: `docs/phase-3/governance-versioning/*`.

2. **Vai trò của NotificationModule trong governance**  

   - Module:
     - Không tự quyết định versioning, chỉ nhận `workflowId: string`.
     - Đảm bảo:
       - Gửi notification đúng `workflowId`.
       - Cung cấp DTOs/interface thống nhất.
   - Governance & versioning:
     - Được triển khai ở **project host**:
       - Config/mapping `NotificationWorkflows`.
       - Feature flags / env-based switches.
       - Quy trình PR & review thay đổi workflows.

3. **Versioning bằng workflowId có hậu tố v2**  

   - Convention:
     - `order-confirmation` → `order-confirmation-v2`.
   - Khi có breaking change:
     - Tạo workflow mới `*-v2` trên Novu.
     - Cập nhật project host để chọn version qua config/feature flag.
     - Vận hành song song v1/v2 trong grace period.
   - Chi tiết:
     - `docs/phase-3/governance-versioning/versioning-strategy.md`
     - `docs/phase-3/governance-versioning/client-migration-playbook.md`

4. **Tách core vs provider-specific (định hướng)**  

   - Ở mức kiến trúc:
     - Hướng tới 2 package:
       - `@company/notification-core`: abstraction, DTOs, service, provider interface.
       - `@company/notification-novu`: implementation provider dùng Novu.
   - Mục tiêu:
     - Reuse đa project.
     - Dễ thay provider tương lai mà không chạm vào domain code.
   - Chi tiết:
     - `docs/phase-3/package-architecture/split-core-vs-provider.md`.

5. **Liên kết tới tài liệu chi tiết**  

   - Governance tổng thể:
     - `docs/GOVERNANCE.md`
   - Hướng dẫn cho project host:
     - `docs/docs-notification/GOVERNANCE_USAGE.md`
   - Phase 3 – tài liệu chi tiết:
     - `docs/phase-3/README.md`
     - `docs/phase-3/governance-versioning/workflow-lifecycle.md`
     - `docs/phase-3/governance-versioning/versioning-strategy.md`
     - `docs/phase-3/governance-versioning/client-migration-playbook.md`


