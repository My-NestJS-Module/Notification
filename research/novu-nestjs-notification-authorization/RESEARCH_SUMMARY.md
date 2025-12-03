## RESEARCH SUMMARY – Novu + NestJS Notification Authorization

> Tài liệu này tổng hợp các nguồn tham khảo, phát hiện chính và kiến trúc đề xuất cho bài toán:  
> “Dùng Novu + backend NestJS để phân quyền **ai được xem thông báo và ai không được xem**, với mô hình API proxy.”

Ngày tổng hợp: **2025-12-02**

---

## 1. Nguồn thông tin đã sử dụng

### 1.1. Tài liệu chính thức Novu (Context7 + Docs)

1. **How Novu Works – Novu Documentation**  
   - URL: `https://docs.novu.co/platform/how-novu-works`  
   - Nguồn: Novu official docs (Context7 `/novuhq/docs`)  
   - Nội dung chính:
     - Giải thích core concepts: **Workflow**, **Environment**, **Subscriber**, **Topic**.
     - Cách ứng dụng gọi API Novu: gửi `workflowIdentifier`, `subscriberId` hoặc `topicKey`, `payload`.
     - Mối quan hệ giữa event trong app và delivery notification đa kênh.
   - Ngày truy cập: 2025-12-02

2. **Introduction to Inbox – Novu Documentation**  
   - URL: `https://docs.novu.co/platform/inbox/overview`  
   - Nội dung chính:
     - Mô tả **Novu Inbox** – component notification center real-time cho in-app.
     - Cách Inbox tự động:
       - Kết nối tới Novu.
       - Lấy danh sách notification & unread count.
       - Đồng bộ thao tác đọc/đánh dấu đọc… về backend Novu.
   - Ngày truy cập: 2025-12-02

3. **Inbox – Prepare for Production (HMAC Security)**  
   - URL: `https://docs.novu.co/platform/inbox/prepare-for-production`  
   - Nội dung chính:
     - Hướng dẫn **bảo mật Inbox bằng HMAC**:
       - Tạo `subscriberHash` từ `subscriberId` + secret key.
       - Novu verify hash để đảm bảo không bị giả mạo identity khi xem feed.
     - Giải thích lý do cần HMAC khi frontend gọi trực tiếp vào Novu Inbox.
   - Ngày truy cập: 2025-12-02

4. **Topics Concept & Topic Schema – Novu Documentation**  
   - Concept: `https://docs.novu.co/platform/concepts/topics`  
   - API Schema: `https://docs.novu.co/api-reference/topics/topic-schema`  
   - Nội dung chính:
     - **Topic** là tập hợp subscribers có chung “interest”.
     - Subscriber có thể thuộc nhiều topic.
     - Khi trigger workflow tới topic, tất cả subscriber trong topic nhận notification.
     - Có tùy chọn `actor` để exclude một subscriber khỏi topic khi trigger.
   - Ngày truy cập: 2025-12-02

5. **Tags in Framework – Novu Documentation**  
   - URL: (nguồn Context7: `/novuhq/docs`, file `framework/tags.mdx`)  
   - Nội dung chính:
     - Cách sử dụng **tags** cho notification:
       - Filter trong Inbox.
       - Cho phép user opt-in/out theo category (ví dụ: `security`, `marketing`, `product-updates`).
   - Ngày truy cập: 2025-12-02

6. **Subscribers Concept – Novu Documentation**  
   - URL: `https://docs.novu.co/platform/concepts/subscribers`  
   - Nội dung chính:
     - Subscriber là representation của user trong mỗi environment.
     - Dashboard cho phép:
       - Tìm kiếm subscriber.
       - Xem topic subscriptions, channel preferences.
   - Ngày truy cập: 2025-12-02

---

### 1.2. Tìm kiếm bổ sung (Tavily / Internet)

1. **How Novu Works – Tavily search result**  
   - Query: `Novu notification permissions audiences "who can see notification" backend access control`  
   - URL: `https://docs.novu.co/platform/how-novu-works`  
   - Phân tích:
     - Docs nhấn mạnh **subscriber/topic** và **preferences**, nhưng **không cung cấp RBAC business-level**.
     - Kết luận: authorization chi tiết (“ai được xem cái gì”) vẫn phải nằm ở backend app.
   - Ngày truy cập: 2025-12-02

2. Các kết quả khác (Courier blog, HashiCorp Vault + FerretDB…)  
   - Một số bài viết liên quan đến notification & permission nói chung, nhưng không trực tiếp liên quan đến Novu + NestJS.
   - Được dùng để tham khảo idea:
     - Cách tách quyền “gửi được notification” và “được hiển thị notification”.
     - Concept policy-based access control.

---

### 1.3. Code & Package Research (npm / code_research)

1. **npm – @novu/js, @novu/framework, novu**  
   - URLs:
     - `https://www.npmjs.com/package/@novu/js`
     - `https://www.npmjs.com/package/@novu/framework`
     - `https://www.npmjs.com/package/novu`
   - Mục đích:
     - Nắm cách sử dụng SDK Novu bên Node.js / frontend.
     - Xem pattern trigger workflow, manage subscribers/topics.

2. **GitHub – novuhq/novu**  
   - URL: `https://github.com/novuhq/novu`  
   - Dùng để:
     - Tham khảo cấu trúc, ví dụ tích hợp.
     - Không copy trực tiếp code, chỉ học pattern tổng quát.

---

## 2. Phát hiện chính

1. **Novu không tự xử lý full business permission “ai được xem thông báo”**
   - Novu cung cấp:
     - Workflow orchestration.
     - Subscribers, topics, tags, preferences.
     - Inbox component & feed API.
   - Nhưng:
     - Không hiểu domain-specific rule (ví dụ: “user chỉ được xem task thuộc project mình”, “user chỉ xem được thông báo order thuộc tenant của mình”…).
   - Kết luận:
     - **Quyết định “ai được phép xem” phải nằm ở backend NestJS**.

2. **Novu phù hợp cho phần “ai sẽ nhận notification” (delivery)**
   - Thông qua:
     - `subscriberId` (per-user).
     - `topicKey` (per-group).
     - Step conditions & preferences (user opt-in/out).
   - Pattern:
     - Backend tính toán target (user/nhóm).
     - Gửi event sang Novu cho những target đó.

3. **Có 2 cách tiếp cận để frontend hiển thị notification, cả 2 đều đảm bảo backend kiểm soát quyền**:
   
   **Cách 1: Hybrid – Novu Inbox Component + HMAC (Khuyến nghị cho quyền đơn giản)**
   - Frontend dùng Novu Inbox component sẵn có (UI đẹp, real-time tự động).
   - Backend cung cấp API `GET /notifications/hmac` để lấy `subscriberHash` (HMAC từ `subscriberId`).
   - Backend kiểm soát quyền ở bước **trigger**: chỉ gửi notification cho user được phép → user chỉ thấy notification của mình trong Inbox.
   - HMAC bảo vệ để tránh user giả mạo `subscriberId`.
   - Phù hợp khi quyền đơn giản (user chỉ xem của chính mình, hoặc theo topic/role mà họ thuộc).

   **Cách 2: Full Proxy – NestJS API Proxy (Phù hợp cho quyền phức tạp)**
   - Frontend tự build UI và gọi API NestJS `GET /notifications` để lấy danh sách.
   - Backend kiểm soát quyền ở cả **trigger + API đọc**:
     - Trigger: chỉ gửi notification cho user được phép.
     - API đọc: filter theo entity, role, tenant, membership… trước khi trả về.
   - Cho phép audit log chi tiết (ai đọc notification nào, lúc nào).
   - Phù hợp khi cần quyền phức tạp (ví dụ: user chỉ xem notification của project họ là member, nhưng không xem của project khác).

4. **Backend luôn kiểm soát quyền ở bước trigger (quan trọng nhất)**
   - Dù chọn cách nào, backend NestJS phải tính toán "ai được nhận notification" trước khi gọi Novu.
   - Backend chỉ trigger Novu cho những subscriber/topic hợp lệ.
   - → User chỉ nhận được notification mà backend đã gửi cho họ.
   - → Khi hiển thị (dù dùng Inbox hay API proxy), user chỉ thấy notification của chính mình.

---

## 3. Kiến trúc đề xuất (tóm tắt)

### 3.1. Thành phần chính

- **NestJS Backend**
  - Modules:
    - `AuthModule`: xác thực JWT.
    - `UsersModule`: quản lý user, role, tenant, …
    - `NotificationsModule`: logic gửi/đọc notification.
  - Layers:
    - Presentation (controllers).
    - Application (app service / use-cases).
    - Domain (policy, domain service).
    - Infrastructure (Novu gateway, repositories).

- **Novu**
  - Workflows: định nghĩa template/luồng gửi thông báo.
  - Subscribers: 1–1 với user.
  - Topics: nhóm user theo project, tenant, role.
  - Tags & preferences: cho phép user filter/opt-in/out.

### 3.2. Luồng chính

- **Gửi thông báo**:
  1. Domain event (TaskCreated, CommentAdded, OrderPaid…).
  2. Domain service xác định target (users/topics).
  3. Ghi log visibility (tùy thiết kế).
  4. Gọi Novu trigger workflow với `subscriberId`/`topicKey`.

- **Đọc thông báo**:
  1. Client gọi `GET /notifications` (hoặc `/projects/:id/notifications`).
  2. Auth guard xác thực user.
  3. Policy kiểm tra quyền theo role/tenant/entity.
  4. App service gọi Novu để lấy feed phù hợp.
  5. Trả về cho client.

---

## 4. Use cases đã xác định (tóm tắt)

1. **Task mới được tạo – thông báo cho assignee & creator**
2. **Comment mới – thông báo cho tất cả participants của task**
3. **Broadcast trong tenant – thông báo hệ thống cho tất cả user trong tenant**
4. **Role-based announcement – chỉ gửi cho ADMIN / MANAGER**
5. **Security notifications – 2FA, đổi mật khẩu, login từ thiết bị lạ**

Chi tiết hơn xem trong:
- `ARCHITECTURE.md` – mục Use Cases.
- `WORKFLOW_PATTERNS.md` – các pattern tương ứng.

---

## 5. Kết luận

- Novu là **notification infrastructure** mạnh nhưng không thay thế backend authorization.
- Giải pháp tối ưu cho bài toán “ai được xem thông báo”:
  - Dùng **Novu cho phần delivery & workflow**.
  - Dùng **NestJS làm API proxy + policy engine** cho quyền xem.
- Bộ tài liệu trong folder này:
  - Đưa ra kiến trúc, pattern và hướng dẫn triển khai theo từng cấp độ kỹ năng.
  - Có thể làm nền tảng để hiện thực hoá module notification trong dự án NestJS thực tế.


