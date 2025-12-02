## Phase 3 – Governance & Versioning cho Notification Module

> Thư mục này gom tất cả tài liệu liên quan đến **Phase 3 – Governance & Versioning** cho module Notification (NestJS + Novu).

### 1. Nội dung chính

- **Governance & Workflow Lifecycle**  
  - Ai được phép tạo/sửa/xoá workflows.  
  - Quy trình review (PR + code review, review trên Novu Dashboard).  
  - Chính sách giữ backward compatibility khi thay đổi template/payload.

- **Versioning & Client Migration**  
  - Quy ước đặt tên version (ví dụ: `order-confirmation-v2`).  
  - Cách migrate caller (NotificationModule / domain services) sang version mới bằng config + feature flag.  
  - Grace period & xử lý deprecate `*-v1`.

- **Tách package nội bộ**  
  - Đề xuất kiến trúc `@company/notification-core` vs `@company/notification-novu`.  
  - Lợi ích cho reuse đa project và khả năng thay provider trong tương lai.

- **Cập nhật kiến trúc tổng thể**  
  - Bản nháp nội dung thêm vào `docs/ARCHITECTURE.md` cho phần Governance.  
  - Liên kết sang `docs/docs-notification/*` để team host áp dụng rule khi tích hợp.

### 2. Cấu trúc thư mục

```text
docs/phase-3/
├── README.md
├── phase-3-code-first-report.md                # Báo cáo Phase 3 (code-first) hiện có, được di chuyển vào đây
├── governance-versioning/
│   ├── workflow-lifecycle.md                   # Quy trình lifecycle + roles + review
│   ├── versioning-strategy.md                  # Naming/versioning + grace period + rule chung
│   └── client-migration-playbook.md            # Cách migrate NotificationModule/clients sang v2
├── package-architecture/
│   └── split-core-vs-provider.md               # Đề xuất tách @company/notification-core vs @company/notification-novu
└── architecture-updates/
    └── governance-section-draft.md             # Bản nháp nội dung sẽ chèn vào ARCHITECTURE.md
```

### 3. Liên kết với các tài liệu khác

- `docs/GOVERNANCE.md`: policy tổng thể ở mức kiến trúc (đã tồn tại).  
- `docs/docs-notification/GOVERNANCE_USAGE.md`: hướng dẫn áp dụng governance từ góc nhìn project host.  
- `docs/ARCHITECTURE.md`: sẽ được bổ sung mục “Governance” và link sang tài liệu trong `docs/phase-3/`.


