## Novu + NestJS Notification Authorization

> Bộ tài liệu này mô tả cách thiết kế & triển khai hệ thống thông báo sử dụng **Novu** kết hợp với **backend NestJS**, với trọng tâm là **phân quyền “ai được xem thông báo”**. 

**Quan trọng**: Backend NestJS kiểm soát quyền bằng cách **chỉ trigger notification cho những user được phép**. Có 2 cách để frontend hiển thị:

1. **Hybrid (Khuyến nghị)**: Dùng **Novu Inbox component** trên frontend + HMAC từ backend. Backend kiểm soát quyền ở bước trigger → user chỉ thấy notification của mình trong Inbox.
2. **Full Proxy**: Frontend tự build UI và gọi **API NestJS** để lấy danh sách notification. Backend kiểm soát quyền ở cả trigger + API đọc.

Cả 2 cách đều được mô tả chi tiết trong tài liệu này.

---

## 1. Mục tiêu dự án

- Thiết kế kiến trúc notification:
  - Gửi được thông báo đa kênh (in-app, email, SMS, push…) qua Novu.
  - Kiểm soát chặt chẽ **quyền xem thông báo** ở backend NestJS.
- Cung cấp guideline theo 4 cấp độ:
  - **Junior**: hiểu cơ bản, triển khai được luồng đơn giản.
  - **Middle**: dùng topic/role/group, module hoá rõ ràng.
  - **Senior**: tách domain service, policy, test coverage tốt.
  - **Principal**: multi-tenant, audit, provider abstraction.

### 1.1. Khi nào chỉ cần Topic? Khi nào cần RBAC/Policy?

> **Câu hỏi thường gặp**: Tại sao phải làm phức tạp với RBAC và policy khi chỉ cần dùng topic để gửi thông báo tới những subscriber đã đăng ký?

**Trả lời ngắn gọn**:
- **Topic chỉ giải quyết phần "gửi" (delivery)**: Gửi notification tới nhiều subscriber cùng lúc.
- **Topic KHÔNG giải quyết**: Ai được phép đăng ký vào topic? Ai được phép trigger? Ai được phép xem notification của topic này?

**Chỉ dùng Topic khi**:
- ✅ Quyền đơn giản, không thay đổi thường xuyên (ví dụ: `role:ADMIN`).
- ✅ User tự chọn đăng ký/hủy đăng ký (opt-in/opt-out tự do).
- ✅ Notification không nhạy cảm (ví dụ: newsletter, product updates).

**Cần Topic + RBAC/Policy khi**:
- ✅ Quyền phức tạp, thay đổi động (ví dụ: `project:123:members` - chỉ member của project mới được đăng ký).
- ✅ Multi-tenant isolation (user tenant A không được thấy notification của tenant B).
- ✅ Cần kiểm soát trigger (chỉ admin mới được gửi notification tới topic).
- ✅ Notification nhạy cảm (salary, security, performance).

**Chi tiết**: Xem `ARCHITECTURE.md` section 2 "Khi nào chỉ cần Topic? Khi nào cần RBAC/Policy?".

---

## 2. Cấu trúc tài liệu

- `ARCHITECTURE.md`
  - Tổng quan kiến trúc, cấu trúc thư mục, dependencies & env.
  - Luồng gửi/đọc thông báo.
  - 5 use case thực tế.
  - Mỗi phần có diễn giải theo 4 cấp độ (junior → principal).

- `Implement_Guide.md`
  - Hướng dẫn triển khai step-by-step:
    - Cài đặt & cấu hình Novu.
    - Tạo module notification trong NestJS.
    - Map user ↔ subscriber, sử dụng topic.
    - Thiết kế policy & domain service.
  - Checklist cho từng cấp độ kỹ năng.

- `WORKFLOW_PATTERNS.md`
  - Các workflow patterns phổ biến:
    - Direct-to-subscriber.
    - Topic-based broadcast.
    - Role-based announcement.
    - Event-driven enriched context.
    - Conditional & preference-based delivery.
  - Advanced patterns:
    - API Proxy pattern (NestJS làm proxy).
    - Multi-tenant notification.
    - Notification visibility mapping.
  - Best practices theo cấp độ.

- `RESEARCH_SUMMARY.md`
  - Danh sách nguồn tài liệu đã dùng (URL + title + ngày truy cập).
  - Tóm tắt phát hiện chính.
  - Kiến trúc đề xuất.
  - Danh sách use case.

---

## 3. Quick Start (luồng cơ bản)

### 3.1. Dành cho Junior

1. Đọc `ARCHITECTURE.md` phần **Junior**:
   - Hiểu khái niệm `subscriber`, `topic`, workflow.
   - Hiểu luồng: domain event → Novu → frontend hiển thị.
   - Hiểu 2 cách tiếp cận: Hybrid (Inbox component) vs Full Proxy (API NestJS).

2. Làm theo `Implement_Guide.md`:
   - Cài Novu, cấu hình `NOVU_API_KEY`.
   - Tạo module `notifications` cơ bản trong NestJS.
   - Viết:
     - `POST /tasks` → tạo task + gửi noti cho assignee (backend kiểm soát quyền).
     - Chọn 1 trong 2:
       - **Hybrid**: `GET /notifications/hmac` → frontend dùng Novu Inbox component.
       - **Full Proxy**: `GET /notifications` → frontend tự render UI.

### 3.2. Dành cho Middle

1. Thêm topic & role-based:
   - Dùng `WORKFLOW_PATTERNS.md` → topic-based & role-based patterns.
2. Tách `NotificationAppService` để gom logic send.
3. Bổ sung route:
   - `GET /projects/:id/notifications` với guard kiểm tra membership.

### 3.3. Dành cho Senior & Principal

- Đọc chi tiết:
  - Phần domain service & policy trong `ARCHITECTURE.md` & `Implement_Guide.md`.
  - Các pattern nâng cao & best practices trong `WORKFLOW_PATTERNS.md`.
- Triển khai:
  - Multi-tenant.
  - Audit log.
  - Policy engine / provider abstraction.

---

## 4. Yêu cầu nền tảng

- Kiến thức:
  - NestJS (module, controller, service, guards, interceptors).
  - RBAC / authorization cơ bản.
  - HTTP API & JWT auth.
- Công cụ:
  - Node.js + npm.
  - Tài khoản Novu (cloud hoặc self-host).

---

## 5. Ghi chú

- Các ví dụ trong tài liệu tập trung vào **thiết kế kiến trúc & quy trình**, không thay thế hoàn toàn cho docs chính thức của Novu:
  - **How Novu Works**  
    `https://docs.novu.co/platform/how-novu-works` (truy cập: 2025-12-02)
  - **Inbox Overview**  
    `https://docs.novu.co/platform/inbox/overview` (truy cập: 2025-12-02)
  - **Topics Concept**  
    `https://docs.novu.co/platform/concepts/topics` (truy cập: 2025-12-02)
  - **Secure Inbox with HMAC**  
    `https://docs.novu.co/platform/inbox/prepare-for-production` (truy cập: 2025-12-02)


