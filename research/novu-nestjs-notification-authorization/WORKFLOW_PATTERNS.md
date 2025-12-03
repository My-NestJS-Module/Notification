## Workflow Patterns & Best Practices cho Novu + NestJS (API Proxy)

> Mục tiêu: Tổng hợp các **pattern thường gặp** khi thiết kế workflow notification với Novu, tích hợp cùng NestJS theo hướng API proxy kiểm soát quyền xem thông báo, kèm best practices cho từng cấp độ (Junior/Middle/Senior/Principal).

---

## 1. Workflow patterns phổ biến

### 1.1. Direct-to-Subscriber (gửi thẳng cho 1 user)

**Mô tả:**
- Gửi thông báo trực tiếp đến 1 user cụ thể (ví dụ: security event, 2FA, đổi mật khẩu).

**Junior:**
- Dùng `subscriberId = user.id`.
- Workflow Novu có 1 step (ví dụ: in-app + email).

**Middle:**
- Thêm metadata/tags: `type=security`, `severity=high`.

**Senior:**
- Domain service tách sự kiện `SecurityEvent` riêng.
- Policy: chỉ chính user đó mới có thể đọc notification đó.

**Principal:**
- Log đầy đủ: ai gửi, ai đọc, trace ID, correlation ID cho mỗi security notification.

---

### 1.2. Topic-based Broadcast (theo project/tenant/group)

**Mô tả:**
- Gửi thông báo đến **nhóm user** có chung mối quan tâm:
  - Ví dụ: tất cả thành viên của project, tất cả user thuộc 1 tenant.

**Junior:**
- Biết khái niệm topic.
- Gửi broadcast tới một topic đơn giản: `tenant:<tenantId>:all`.

**Middle:**
- Chuẩn hoá naming:
  - `project:<projectId>:members`
  - `tenant:<tenantId>:all`
  - `role:<roleName>`
- Tự động add/remove subscriber vào topic khi:
  - User join/leave project.
  - User đổi tenant/role.

**Senior:**
- Tắt/bật broadcast theo loại thông báo:
  - Dùng tag/workflow preferences để user opt-in/out 1 số topic-thể-loại.
- Đảm bảo topic mapping đồng bộ với domain (job định kỳ / event-driven).

**Principal:**
- Thiết kế topic theo **multi-tenant isolation**:
  - Không có topic cross-tenant.
  - Có thể enforce pattern naming bằng validator/CI rule.

---

### 1.3. Role-based Announcement (theo quyền)

**Mô tả:**
- Gửi thông báo chỉ cho 1 số role (ADMIN, MANAGER, SUPPORT, …).

**Junior:**
- Dùng topic `role:<ROLE>` đơn giản.

**Middle:**
- Tự động add user vào topic role khi:
  - User được gán role.
  - User đổi role.

**Senior:**
- Kết hợp với backend policy:
  - API đọc thông báo kiểm tra:
    - User có role tương ứng hay không.
  - Tránh trường hợp workflow gửi sai role do bug.

**Principal:**
- Tách role system của domain & permission system của notification:
  - Dùng mapping `domainRole → notificationTopic`.

---

### 1.4. Event-driven with Enriched Context

**Mô tả:**
- Notification được phát sinh từ domain event (TaskCreated, CommentAdded, OrderPaid…) với payload phong phú.

**Junior:**
- Chỉ gửi thông tin basic (title, link).

**Middle:**
- Thêm context trong payload:
  - `projectName`, `assigneeName`, `priority`, v.v.
- Tối ưu template workflow để hiển thị đủ thông tin quan trọng.

**Senior:**
- Domain event chuẩn hoá:
  - `TaskCreatedEvent`, `TaskUpdatedEvent`, `TaskCommentedEvent`.
  - Mỗi event có schema rõ ràng.
- Notification service chỉ nhận event, không truy vấn DB thêm (nếu có thể).

**Principal:**
- Dùng event bus / message broker:
  - `task-service` phát event.
  - `notification-service` subscribe và xử lý, đẩy sang Novu.

---

### 1.5. Conditional & Preference-based Delivery

**Mô tả:**
- Cho phép user chọn nhận loại thông báo nào (preferences).
- Dùng điều kiện trong workflow step (channel preferences, step conditions).

**Junior:**
- Dùng mặc định channel preferences đơn giản của Novu.

**Middle:**
- Mapping giữa loại notification (tag) và preference UI:
  - Ví dụ: `marketing`, `product-updates`, `security-alerts`.

**Senior:**
- Kết hợp preferences với **domain rule**:
  - Một số notification **bắt buộc** (security, compliance) không thể tắt.

**Principal:**
- Lưu preferences ở domain riêng (có thể sync với Novu hoặc apply ở API proxy).

---

## 2. Advanced Patterns (khớp với API Proxy NestJS)

### 2.1. API Proxy Pattern (chọn trong dự án này)

**Ý tưởng:**
- Tất cả thao tác đọc notification phải đi qua **NestJS API** (không gọi trực tiếp Novu).

**Lợi ích:**
- Kiểm soát chặt chẽ quyền xem.
- Ẩn `NOVU_API_KEY`, tránh lộ public.
- Có thể combine dữ liệu Novu + dữ liệu internal (DB) trước khi trả về.

**Best practice theo cấp độ:**
- Junior:
  - Mọi route `/notifications` đều có `JwtAuthGuard`.
- Middle:
  - Dùng decorator `@CurrentUser()` cho controller, không đọc `req` trực tiếp.
- Senior:
  - Dùng các guard/policy riêng cho từng kiểu resource:
    - `ProjectNotificationGuard`, `TenantNotificationGuard`, v.v.
- Principal:
  - Tách API gateway + notification service.
  - Có route-specific rate limit cho notification (tránh abuse).

---

### 2.2. Multi-tenant Notification Pattern

**Mục tiêu:**
- Mỗi tenant chỉ nhìn được notification trong tenant của mình.

**Implementation gợi ý:**
- Topic naming: luôn include `tenantId`.
- Notification metadata luôn có `tenantId`.
- Policy:
  - `if requestUser.tenantId !== notification.tenantId → Forbidden`.

**Best practice:**
- Middle:
  - TenantId được gắn vào JWT, không lấy từ query param.
- Senior:
  - Thêm integration test đảm bảo user tenant A không thể đọc noti tenant B.
- Principal:
  - Support tenant-level configuration:
    - Bật/tắt các loại notification.
    - Override template theo tenant.

---

### 2.3. Notification Visibility Mapping Pattern

**Mục tiêu:**
- Lưu rõ **notification này thuộc entity gì, ai được xem** (để audit, re-check, re-sync).

**Option:**
- Tạo bảng `notification_visibility` trong DB:
  - `notificationId`
  - `entityType`, `entityId`
  - `userId` / `roleId` / `groupId`

**Pattern hoạt động:**
1. Domain event → xác định target list.
2. Ghi `notification_visibility`.
3. Trigger Novu.
4. Khi API đọc notification:
   - Dùng Novu ID / metadata map ngược với `notification_visibility` trong DB.
   - Apply policy.

**Ưu điểm:**
- Có toàn bộ lịch sử “ai được phép xem”.
- Dễ phân tích/truy vết khi có lỗi bảo mật.

---

## 3. Best Practices tổng hợp

### 3.1. Theo cấp độ kỹ năng

**Junior**
- Hiểu rõ:
  - Không dùng API key Novu ở frontend.
  - `subscriberId` phải trùng hoặc map 1–1 với user trong DB.
- Thử nghiệm:
  - 1–2 workflow đơn giản.
  - Gửi và đọc notification của chính user.

**Middle**
- Chuẩn hoá:
  - Convention topic / tag / metadata.
  - Cấu trúc module `notifications` trong NestJS.
- Áp dụng:
  - Topic-based broadcast.
  - Role-based hoặc group-based announcement.

**Senior**
- Tách domain:
  - Policy, domain service, infra gateway.
- Viết test:
  - Policy evaluation.
  - Mapping event → target.
- Giám sát:
  - Log lỗi khi call Novu.
  - Retry / dead-letter nếu cần.

**Principal**
- Kiến trúc hệ thống:
  - Multi-tenant thông báo.
  - Provider abstraction.
  - Event-driven notification.
- Bảo mật & compliance:
  - Audit log.
  - Data minimization trong payload.
  - Chuẩn bị cho data residency / GDPR (nếu cần).

---

### 3.2. Lỗi thường gặp & cách tránh

- **Lẫn lộn giữa “nhận được notification” và “được phép xem notification”**
  - Fix:
    - Luôn tách **target selection** (ai sẽ được gửi) và **permission** (ai được đọc) thành 2 bước.
- **Không đồng bộ topic với domain**
  - Fix:
    - Luôn chạy job hoặc dùng event để sync khi user join/leave project/tenant.
- **Hard-code logic phân quyền rải rác trong controller**
  - Fix:
    - Gom vào `NotificationPolicy` hoặc policy engine.
- **Gửi quá nhiều notification (noise)**
  - Fix:
    - Dùng preferences & tags.
    - Thiết kế workflow step condition rõ ràng.

---

## 4. Tóm tắt

- Novu cung cấp **workflow + subscriber + topic + preferences**.
- NestJS đóng vai trò:
  - **Proxy bảo mật** với API key.
  - **Policy engine** quyết định “ai được xem”.
  - **Orchestrator** nhận domain event → chọn target → gọi Novu.
- Các pattern trên giúp thiết kế hệ thống notification:
  - Dễ mở rộng.
  - Dễ kiểm soát quyền.
  - Dễ audit và bảo trì lâu dài.


