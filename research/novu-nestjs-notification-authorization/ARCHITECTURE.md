## Kiến trúc phân quyền xem thông báo với Novu + NestJS

> Mục tiêu: Thiết kế kiến trúc backend NestJS dùng Novu để gửi/đọc thông báo, nhưng **quyền “ai được xem thông báo”** được kiểm soát hoàn toàn bởi backend (API proxy), không để client gọi trực tiếp Novu.

---

## 1. Tổng quan (4 cấp độ)

### 1.1. Junior
- Hiểu được:
  - Hệ thống có **NestJS backend** + **Novu** (notification platform).
  - User chỉ được xem thông báo **của chính mình** hoặc trong **phạm vi được cấp quyền**.
  - Frontend **gọi API NestJS** để lấy danh sách thông báo, **không** gọi trực tiếp Novu.
- Ý tưởng đơn giản:
  - Khi có sự kiện (ví dụ: tạo task mới), backend quyết định **những user nào** nhận thông báo.
  - Backend gửi event sang Novu với `subscriberId` hoặc `topicKey`.
  - Khi frontend cần hiển thị notification, gọi API `GET /notifications` của NestJS, NestJS sẽ:
    - Kiểm tra user đã đăng nhập.
    - Chỉ truy vấn thông báo tương ứng với user đó.

### 1.2. Middle
- Bổ sung khái niệm:
  - **Subscriber**: ánh xạ 1–1 với `User` trong DB.
  - **Topic**: nhóm nhiều subscriber (ví dụ: theo project, theo role, theo tenant).
  - **RBAC**: mỗi user có `role` (ADMIN, MANAGER, MEMBER, …) và/hoặc `permissions`.
- Trách nhiệm:
  - Thiết kế **module Notification** trong NestJS:
    - `NotificationModule`, `NotificationService`, `NotificationController`.
    - Sử dụng `NovuClient` (SDK hoặc HTTP client).
  - Sử dụng **Guards** và **Decorators** (ví dụ: `JwtAuthGuard`, `RolesGuard`) để bảo vệ các route:
    - `GET /notifications` trả về thông báo **theo user hiện tại**.
    - `GET /notifications/:entityId` chỉ cho phép xem nếu user có quyền trên entity đó (vd: project, order, …).

### 1.3. Senior
- Thiết kế kiến trúc lớp:
  - **API Layer (Controller)**: chỉ xử lý HTTP, dùng guard để authz.
  - **Application Layer (Use case / Service)**:
    - `NotificationFacade` / `NotificationAppService`:
      - Nhận input từ controller (user hiện tại, filter…).
      - Gọi **Domain Service** để tính toán “ai được xem”.
      - Gọi **NovuGateway** (infrastructure) để tương tác Novu (trigger workflow, fetch feed…).
  - **Domain Layer**:
    - `NotificationPolicy` / `NotificationVisibilityService`:
      - Chứa rule: Ai được xem notification nào (theo role, owner, tenant, membership…).
  - **Infrastructure Layer**:
    - `NovuClient` wrapper (SDK hoặc REST).
    - Repositories (UserRepo, ProjectRepo, TenantRepo…).
- Mô hình phân quyền:
  - Kết hợp **RBAC** + **domain rules**:
    - Role định nghĩa quyền tổng quát (xem tất cả, xem trong tenant, xem của chính mình).
    - Domain rule kiểm tra quan hệ (user có thuộc project, team, tenant của entity đó không).

### 1.4. Principal
- Yêu cầu cao hơn:
  - Hỗ trợ **multi-tenant**: mỗi tenant có namespace topic riêng (`tenant:<tenantId>:project:<projectId>`).
  - Hỗ trợ **audit & observability**:
    - Log toàn bộ action gửi/đọc thông báo (ai đọc, đọc lúc nào, nguồn IP…).
  - Thiết kế **policy engine**:
    - Có thể dùng các thư viện như CASL / custom Policy DSL.
    - Rule có thể cấu hình qua database / UI quản trị, không hard-code.
  - An toàn dữ liệu:
    - Không để lộ `subscriberId` hay token Novu ra ngoài mà không qua kiểm tra backend.
    - Mã hóa/ẩn bớt thông tin nhạy cảm trong payload notification.
  - Khả năng mở rộng:
    - Tách Notification thành **bounded context riêng** (microservice) nếu cần:
      - Nhận domain events từ các service khác (qua message bus).
      - Vẫn giữ một API layer bảo vệ quyền truy cập đọc notification.

---

## 2. Khi nào chỉ cần Topic? Khi nào cần RBAC/Policy?

> **Câu hỏi quan trọng**: Tại sao phải làm phức tạp với RBAC và policy khi chỉ cần dùng topic để gửi thông báo tới những subscriber đã đăng ký?

### 2.1. Topic chỉ giải quyết phần "gửi" (delivery)

**Topic trong Novu**:
- Là cách để **gửi notification tới nhiều subscriber cùng lúc**.
- Subscriber tự đăng ký vào topic (hoặc backend thêm subscriber vào topic).
- Khi trigger workflow tới topic, tất cả subscriber trong topic nhận notification.

**Topic KHÔNG giải quyết**:
- ❌ **Ai được phép đăng ký vào topic này?** (Ví dụ: Chỉ member của project mới được đăng ký vào `project:123:members`)
- ❌ **Ai được phép trigger notification tới topic này?** (Ví dụ: Chỉ admin mới được gửi notification tới `role:ADMIN`)
- ❌ **Ai được phép xem notification của topic này?** (Ví dụ: User bị remove khỏi project, nhưng vẫn có thể thấy notification cũ nếu không có policy filter)

### 2.2. Khi nào CHỈ CẦN Topic (không cần RBAC/policy phức tạp)?

**Use case phù hợp**:
1. **Public topics, opt-in tự do**:
   - Ví dụ: `newsletter`, `product-updates`, `marketing-promotions`
   - User tự chọn đăng ký/hủy đăng ký.
   - Không cần kiểm soát chặt chẽ ai được đăng ký.

2. **Quyền đơn giản, không thay đổi thường xuyên**:
   - Ví dụ: `role:ADMIN` (tất cả admin nhận thông báo system)
   - Admin list ít thay đổi, không cần kiểm tra real-time.

3. **Notification không nhạy cảm**:
   - Ví dụ: Thông báo feature mới, blog post mới
   - Không có rủi ro nếu user không liên quan nhận được.

**Ví dụ code (chỉ dùng topic)**:
```typescript
// Đơn giản: User tự đăng ký topic
async subscribeToNewsletter(userId: string) {
  await this.novuClient.topics.addSubscribers('newsletter', {
    subscribers: [userId]
  });
}

// Trigger: Bất kỳ ai cũng có thể trigger (hoặc chỉ admin)
async sendNewsletter(content: string) {
  await this.novuClient.trigger('newsletter-sent', {
    to: { type: 'Topic', topicKey: 'newsletter' },
    payload: { content }
  });
}
```

### 2.3. Khi nào CẦN RBAC/Policy?

**Use case phù hợp**:
1. **Quyền phức tạp, thay đổi động**:
   - Ví dụ: `project:123:members` (chỉ member của project 123 mới được đăng ký)
   - Member list thay đổi thường xuyên (thêm/xóa member).
   - Cần kiểm tra real-time: User có còn là member không?

2. **Multi-tenant isolation**:
   - Ví dụ: User tenant A không được thấy notification của tenant B.
   - Cần policy kiểm tra `user.tenantId === notification.tenantId`.

3. **Kiểm soát trigger**:
   - Ví dụ: Chỉ admin hoặc owner của project mới được gửi notification tới `project:123:members`.
   - Cần guard/policy kiểm tra quyền trước khi trigger.

4. **Audit & compliance**:
   - Cần log: Ai đã đọc notification nào, lúc nào.
   - Cần filter: User chỉ được xem notification của entity họ có quyền.

5. **Notification nhạy cảm**:
   - Ví dụ: Thông báo về salary, performance review, security alerts.
   - Cần đảm bảo chỉ đúng người mới thấy.

**Ví dụ vấn đề nếu KHÔNG có policy**:

```typescript
// ❌ VẤN ĐỀ: User có thể tự đăng ký vào topic bất kỳ
async subscribeToProjectTopic(userId: string, projectId: string) {
  // Không kiểm tra: User có phải member của project không?
  await this.novuClient.topics.addSubscribers(`project:${projectId}:members`, {
    subscribers: [userId]
  });
  // → User có thể tự đăng ký vào project họ không thuộc!
}

// ❌ VẤN ĐỀ: User bị remove khỏi project, nhưng vẫn thấy notification cũ
async removeUserFromProject(userId: string, projectId: string) {
  await this.projectRepo.removeMember(userId, projectId);
  // Quên remove khỏi topic → User vẫn nhận notification mới!
  // Hoặc: User vẫn thấy notification cũ trong Inbox (nếu không filter)
}

// ❌ VẤN ĐỀ: Bất kỳ ai cũng có thể trigger notification tới topic
async sendProjectNotification(projectId: string, content: string, userId: string) {
  // Không kiểm tra: User có quyền gửi notification tới project này không?
  await this.novuClient.trigger('project-notification', {
    to: { type: 'Topic', topicKey: `project:${projectId}:members` },
    payload: { content }
  });
  // → User có thể spam notification tới project họ không thuộc!
}
```

**Ví dụ code CÓ policy**:

```typescript
// ✅ GIẢI PHÁP: Kiểm tra quyền trước khi đăng ký
async subscribeToProjectTopic(userId: string, projectId: string) {
  // Policy kiểm tra: User có phải member của project không?
  const isMember = await this.projectPolicy.isMember(userId, projectId);
  if (!isMember) {
    throw new ForbiddenException('Not a member of this project');
  }
  
  await this.novuClient.topics.addSubscribers(`project:${projectId}:members`, {
    subscribers: [userId]
  });
}

// ✅ GIẢI PHÁP: Đồng bộ topic khi member thay đổi
async removeUserFromProject(userId: string, projectId: string) {
  await this.projectRepo.removeMember(userId, projectId);
  
  // Đồng bộ: Remove khỏi topic
  await this.novuClient.topics.removeSubscribers(`project:${projectId}:members`, {
    subscribers: [userId]
  });
  
  // Nếu dùng API proxy: Filter notification cũ theo policy
  // → User không còn thấy notification của project này
}

// ✅ GIẢI PHÁP: Kiểm tra quyền trước khi trigger
async sendProjectNotification(projectId: string, content: string, userId: string) {
  // Policy kiểm tra: User có quyền gửi notification tới project này không?
  const canSend = await this.notificationPolicy.canSendToProject(userId, projectId);
  if (!canSend) {
    throw new ForbiddenException('No permission to send notification');
  }
  
  await this.novuClient.trigger('project-notification', {
    to: { type: 'Topic', topicKey: `project:${projectId}:members` },
    payload: { content }
  });
}

// ✅ GIẢI PHÁP: Filter notification theo policy khi đọc
async getProjectNotifications(projectId: string, userId: string) {
  // Policy kiểm tra: User có quyền xem notification của project này không?
  const canView = await this.notificationPolicy.canViewProjectNotifications(userId, projectId);
  if (!canView) {
    throw new ForbiddenException('No permission to view notifications');
  }
  
  // Lấy notification từ Novu (có thể filter theo tag/topic)
  return this.novuClient.getNotifications({
    subscriberId: userId,
    filters: { topic: `project:${projectId}:members` }
  });
}
```

### 2.4. Bảng so sánh

| Tiêu chí | Chỉ dùng Topic | Topic + RBAC/Policy |
|----------|----------------|---------------------|
| **Quyền đăng ký** | Tự do (user tự chọn) | Kiểm soát (backend quyết định) |
| **Quyền trigger** | Không kiểm tra | Kiểm tra (guard/policy) |
| **Quyền xem** | Tất cả notification của user | Filter theo policy |
| **Đồng bộ membership** | Không cần | Cần (khi member thay đổi) |
| **Multi-tenant** | Không hỗ trợ | Hỗ trợ (isolation) |
| **Audit log** | Hạn chế | Chi tiết |
| **Phức tạp** | Đơn giản | Phức tạp hơn |
| **Phù hợp** | Public topics, opt-in tự do | Business-critical, nhạy cảm |

### 2.5. Khuyến nghị

**Dùng CHỈ Topic khi**:
- ✅ Quyền đơn giản, không thay đổi thường xuyên.
- ✅ User tự chọn đăng ký/hủy đăng ký (opt-in/opt-out).
- ✅ Notification không nhạy cảm.
- ✅ Không cần audit log chi tiết.

**Dùng Topic + RBAC/Policy khi**:
- ✅ Quyền phức tạp, thay đổi động (ví dụ: project membership).
- ✅ Cần kiểm soát chặt chẽ ai được đăng ký/trigger/xem.
- ✅ Multi-tenant isolation.
- ✅ Notification nhạy cảm (salary, security, performance).
- ✅ Cần audit log chi tiết.

**Kết hợp cả 2**:
- Dùng **Topic đơn giản** cho notification public (newsletter, product updates).
- Dùng **Topic + Policy** cho notification business-critical (project, order, security).

---

## 3. Kiến trúc lớp & cấu trúc thư mục

### 2.1. Gợi ý cấu trúc thư mục NestJS

Ở mức tối thiểu:

```text
src/
  modules/
    auth/
    users/
    notifications/
      application/
      domain/
      infrastructure/
      presentation/
  shared/
    guards/
    decorators/
    infra/
```

- `notifications/presentation`:
  - `notification.controller.ts`
- `notifications/application`:
  - `notification-app.service.ts` (hoặc `use-cases`)
- `notifications/domain`:
  - `notification-policy.service.ts`
  - Entity / ValueObject: `NotificationContext`, `NotificationTarget`, …
- `notifications/infrastructure`:
  - `novu.client.ts` (wrapper)
  - `notification.repository.ts` (nếu lưu log, mapping, v.v.)

Ở mức phức tạp hơn (principal), có thể tách riêng thành:

- `apps/api-gateway` (HTTP API bảo vệ permission).
- `apps/notification-service` (microservice handle event & push Novu).

---

## 3. Dependencies & Environment Variables

### 3.1. Thư viện chính

- **Backend**:
  - `@nestjs/common`, `@nestjs/core`, `@nestjs/jwt`, `@nestjs/passport`, …
  - ORM: `@prisma/client` / `typeorm` / `sequelize` (tuỳ chọn).
  - `axios` hoặc `@novu/node` / `@novu/framework` (khi dùng SDK).
- **Novu**:
  - CLI: `novu`
  - SDK frontend: `@novu/js`, `@novu/react` (nếu dùng Inbox component, nhưng đọc quyền vẫn qua backend).

### 3.2. Environment variables (ví dụ)

- `NOVU_API_KEY`: API key để backend gọi Novu.
- `NOVU_APP_ID` (nếu cần cho integration cụ thể).
- `NOVU_BASE_URL` (nếu dùng self-host hoặc custom domain).
- `JWT_SECRET` / `AUTH_PUBLIC_KEY`: dùng cho xác thực user.
- `DB_URL`: connection string DB.

Lưu ý:
- **Không expose NOVU_API_KEY** ra frontend.
- Mọi call đến Novu phải thông qua server-side (NestJS).

---

## 4. Luồng hoạt động (High level)

### 4.1. Luồng gửi thông báo (Trigger)

**Junior view**:
- 1) User tạo một hành động (vd: tạo task mới).
- 2) Backend xử lý xong, gọi hàm `NotificationService.triggerTaskCreated(...)`.
- 3) Hàm này gửi sự kiện sang Novu cho những user liên quan.

**Middle/Senior view (chi tiết hơn)**:
1. **Domain event** phát sinh: `TaskCreatedEvent { taskId, projectId, createdBy, assignees[] }`.
2. **Notification Domain Service**:
   - Tính toán **target**:
     - Chủ sở hữu task.
     - Assignees.
     - Optional: members trong project.
3. Map target →:
   - `subscriberIds[]` (nếu gửi cá nhân).
   - Hoặc topic: `project:<projectId>:members`.
4. Gọi `NovuGateway.triggerWorkflow(workflowId, target, payload)`.

### 4.2. Luồng đọc thông báo – 2 cách tiếp cận

> **Quan trọng**: Backend NestJS kiểm soát quyền "ai được xem thông báo" bằng cách **chỉ trigger notification cho những user được phép**. Nhưng có 2 cách để frontend hiển thị:

#### 4.2.1. Cách 1: Hybrid – Dùng Novu Inbox Component + HMAC (Khuyến nghị)

**Ưu điểm**:
- Frontend vẫn dùng component Inbox sẵn có của Novu (UI đẹp, real-time, mark as read tự động).
- Backend vẫn kiểm soát quyền: chỉ gửi notification cho user được phép → user chỉ thấy notification của mình.
- Bảo mật bằng HMAC để đảm bảo user không thể giả mạo `subscriberId`.

**Luồng hoạt động**:
1. **Backend kiểm soát trigger** (như mục 4.1):
   - Khi có sự kiện, backend tính toán "ai được nhận notification".
   - Backend chỉ trigger Novu cho những subscriber/topic hợp lệ.
   - → User chỉ nhận được notification mà backend đã gửi cho họ.

2. **Frontend lấy HMAC từ backend**:
   - Frontend gọi `GET /notifications/hmac` với JWT.
   - Backend:
     - Xác thực user (`JwtAuthGuard`).
     - Kiểm tra quyền (user có được xem notification không?).
     - Tạo `subscriberHash` bằng HMAC từ `subscriberId = user.id` + secret key.
     - Trả về: `{ subscriberId, subscriberHash }`.

3. **Frontend dùng Novu Inbox component**:
   ```tsx
   // React example
   import { NovuProvider, PopoverNotificationCenter } from '@novu/react';
   
   <NovuProvider
     subscriberId={subscriberId}  // từ backend
     subscriberHash={subscriberHash}  // từ backend
     applicationIdentifier={NOVU_APP_ID}
   >
     <PopoverNotificationCenter />
   </NovuProvider>
   ```
   - Component tự động kết nối Novu và lấy notification của `subscriberId` đó.
   - User chỉ thấy notification mà backend đã gửi cho họ (vì backend chỉ trigger cho user được phép).

**Khi nào dùng**:
- Khi muốn UI nhanh, không cần custom nhiều.
- Khi quyền xem notification đơn giản (user chỉ xem của chính mình, hoặc theo topic/role mà họ thuộc).

**Lưu ý**:
- Nếu cần filter phức tạp hơn (ví dụ: user chỉ xem notification của project họ là member, nhưng không xem notification của project khác), bạn phải đảm bảo backend **không trigger** notification cho project họ không thuộc.

#### 4.2.2. Cách 2: Full Proxy – NestJS API Proxy (Lựa chọn B)

**Ưu điểm**:
- Kiểm soát hoàn toàn quyền truy cập ở backend (có thể filter theo entity, role, tenant phức tạp).
- Có thể audit log chi tiết (ai đọc notification nào, lúc nào).
- Frontend tự build UI, linh hoạt hơn.

**Nhược điểm**:
- Phải tự implement UI notification (không dùng Inbox component).
- Phải tự handle real-time updates (nếu cần, có thể dùng WebSocket hoặc polling).

**Luồng hoạt động**:
1. **Backend kiểm soát trigger** (như mục 4.1).

2. **Frontend gọi API NestJS**:
   - `GET /notifications?limit=20&cursor=...` với JWT.
   - Backend:
     - `JwtAuthGuard` xác thực user → gắn `req.user`.
     - `NotificationPolicy` kiểm tra quyền (user có quyền `NOTIFICATION:LIST` không?).
     - `NotificationAppService`:
       - Xây **NotificationContext**: `userId`, `roles`, `tenantId`, `scopes`, …
       - Tính toán filter dựa trên quyền:
         - Nếu user chỉ xem của chính mình → `subscriberId = user.id`.
         - Nếu user xem theo entity → filter theo `entityId` + kiểm tra user có quyền trên entity đó.
       - Gọi `NovuGateway.getNotificationsForSubscriber(subscriberId, filters)` hoặc `listByTag(...)`.
     - Trả kết quả (đã filter) về cho client.

3. **Frontend tự render UI**:
   - Nhận JSON từ API, tự build component hiển thị.
   - Nếu cần real-time: có thể dùng WebSocket hoặc polling.

**Khi nào dùng**:
- Khi cần quyền truy cập phức tạp (ví dụ: user chỉ xem notification của project họ là member, nhưng không xem của project khác, và cần audit log).
- Khi muốn custom UI hoàn toàn.
- Khi cần tích hợp notification vào UI hiện có (không dùng component riêng).

**Lưu ý**:
- Có thể kết hợp cả 2 cách: dùng Inbox cho user xem notification của chính mình, dùng API proxy cho admin xem tất cả (với quyền kiểm soát chặt chẽ).

### 4.3. So sánh 2 cách tiếp cận

| Tiêu chí | Hybrid (Inbox + HMAC) | Full Proxy (API NestJS) |
|----------|----------------------|------------------------|
| **UI** | Dùng component sẵn có | Tự build |
| **Real-time** | Tự động (Novu handle) | Phải tự implement (WebSocket/polling) |
| **Kiểm soát quyền** | Ở bước trigger (backend chỉ gửi cho user được phép) | Ở cả trigger + API đọc (backend filter khi query) |
| **Audit log** | Hạn chế (Novu log) | Chi tiết (backend log) |
| **Phức tạp quyền** | Phù hợp quyền đơn giản | Phù hợp quyền phức tạp |
| **Tốc độ phát triển** | Nhanh | Chậm hơn (phải build UI) |

**Khuyến nghị**:
- **Junior/Middle**: Dùng **Hybrid** (Inbox + HMAC) để nhanh chóng.
- **Senior/Principal**: Có thể dùng **Full Proxy** nếu cần quyền phức tạp, hoặc kết hợp cả 2 (Inbox cho user thường, API proxy cho admin/quản trị).

### 4.3. Luồng phân quyền chi tiết theo entity

Ví dụ: `GET /projects/:projectId/notifications`:

1. Guard/Policy kiểm tra:
   - User có thuộc project (member/owner) không?
2. Nếu có:
   - Tùy thiết kế:
     - Hoặc bạn lưu metadata notification trong DB (liên kết `projectId`) rồi filter),
     - Hoặc dùng tags/topics trong Novu (vd: tag `project:<projectId>`).
3. Gọi `NovuGateway.listByTag('project:<projectId>')` (pseudo).
4. Trả về danh sách.

---

## 5. 5 Use Case thực tế

Mỗi use case có thể được mô tả theo 4 level (simple → advanced). **Quan trọng**: Mỗi use case sẽ chỉ rõ khi nào chỉ cần topic, khi nào cần RBAC/policy.

1. **Thông báo task mới cho assignee và creator**
   - Trigger: `TaskCreatedEvent`.
   - Target:
     - Assignee (`subscriberId`).
     - Creator (`subscriberId`) nếu khác assignee.
   - **Cần Policy?**: ✅ **CÓ** (nếu dùng API proxy để filter)
     - Lý do: Cần đảm bảo chỉ assignee & creator thấy thông báo.
     - Nếu dùng Inbox component: Backend chỉ trigger cho assignee/creator → không cần policy filter (nhưng vẫn cần policy kiểm tra quyền trigger).
   - **Có thể chỉ dùng Topic?**: ❌ **KHÔNG** (vì target cụ thể, không phải nhóm)

2. **Thông báo comment mới trong task cho tất cả participants**
   - Trigger: `CommentAddedEvent { taskId }`.
   - Tìm tất cả user đã từng tương tác/thuộc group "watchers" của task.
   - Gửi notification chỉ cho họ.
   - **Cần Policy?**: ✅ **CÓ** (nếu participants list thay đổi động)
     - Lý do: Cần đảm bảo chỉ participants thực sự thấy thông báo.
     - Nếu participants list ít thay đổi: Có thể dùng topic `task:<taskId>:participants` + đồng bộ khi thêm/xóa participant.
   - **Có thể chỉ dùng Topic?**: ⚠️ **CÓ THỂ** (nếu đồng bộ topic khi participants thay đổi)

3. **Thông báo broadcast theo tenant**
   - Trigger: admin của tenant tạo "system message".
   - Topic: `tenant:<tenantId>:all`.
   - **Cần Policy?**: ✅ **CÓ** (quan trọng cho multi-tenant)
     - Lý do: Cần đảm bảo user tenant A không thấy notification của tenant B.
     - Policy kiểm tra: `user.tenantId === notification.tenantId`.
     - Nếu dùng Inbox component: Backend chỉ trigger cho subscriber trong tenant → vẫn cần policy kiểm tra quyền trigger.
   - **Có thể chỉ dùng Topic?**: ❌ **KHÔNG** (vì cần multi-tenant isolation)

4. **Thông báo theo role (role-based announcement)**
   - Trigger: release mới cho `ADMIN` và `MANAGER`.
   - Topic: `role:ADMIN`, `role:MANAGER`.
   - **Cần Policy?**: ⚠️ **TÙY TRƯỜNG HỢP**
     - **Chỉ cần Topic nếu**: Role list ít thay đổi, không cần kiểm soát chặt chẽ.
     - **Cần Policy nếu**: 
       - Cần kiểm tra quyền trigger (chỉ super admin mới được gửi).
       - Cần audit log (ai đã đọc notification nào).
       - Role list thay đổi thường xuyên (cần đồng bộ topic).
   - **Có thể chỉ dùng Topic?**: ✅ **CÓ** (nếu quyền đơn giản, không nhạy cảm)

5. **Thông báo security-critical (2FA, đổi mật khẩu, đăng nhập mới)**
   - Trigger: `SecurityEvent`.
   - Chỉ gửi trực tiếp tới `subscriberId = user.id` (không dùng topic).
   - Payload tối giản, không lộ thông tin nhạy cảm.
   - **Cần Policy?**: ✅ **CÓ** (bắt buộc)
     - Lý do: Notification nhạy cảm, cần đảm bảo chỉ đúng user thấy.
     - Policy kiểm tra: `user.id === notification.subscriberId`.
     - Audit log bắt buộc: Ghi lại ai đã đọc, lúc nào.
   - **Có thể chỉ dùng Topic?**: ❌ **KHÔNG** (vì nhạy cảm, cần kiểm soát chặt chẽ)

### 5.1. Tóm tắt Use Case theo mức độ cần Policy

| Use Case | Chỉ dùng Topic? | Cần Policy? | Lý do |
|----------|----------------|-------------|-------|
| Task mới (assignee/creator) | ❌ | ✅ | Target cụ thể, không phải nhóm |
| Comment (participants) | ⚠️ Có thể | ⚠️ Tùy | Nếu đồng bộ topic khi thay đổi → chỉ cần topic |
| Broadcast tenant | ❌ | ✅ | Multi-tenant isolation bắt buộc |
| Role-based announcement | ✅ | ⚠️ Tùy | Nếu quyền đơn giản → chỉ cần topic |
| Security-critical | ❌ | ✅ | Nhạy cảm, audit bắt buộc |

---

## 6. Chi tiết implementation (code-level – định hướng)

Ở file `Implement_Guide.md` sẽ đi sâu:
- Ví dụ module NestJS, DTO, guards, policy, cách gọi Novu.
- Code mẫu cho từng cấp độ:
  - **Junior**: chỉ cần dùng `NotificationService.triggerForUser(userId, payload)`.
  - **Middle**: bắt đầu dùng topics & role-based.
  - **Senior**: tách domain service, policy rõ ràng, unit test.
  - **Principal**: multi-tenant, audit log, policy engine cấu hình được.

---

## 7. Hướng dẫn tái sử dụng & mở rộng (tóm tắt)

- **Tái sử dụng**:
  - Đặt toàn bộ logic gọi Novu vào 1 gateway/service duy nhất.
  - Đặt logic phân quyền vào `NotificationPolicy` (domain) + NestJS guards/decorators.
  - Các module domain khác (task, project, order, …) chỉ bắn **domain event**, không gọi Novu trực tiếp.

- **Mở rộng**:
  - Thêm kênh (email/SMS/push) chỉ là mở rộng workflow ở Novu và payload, backend vẫn dùng cùng gateway.
  - Thêm kiểu phân quyền: thêm rule trong policy hoặc policy engine (kết hợp role, attribute-based access).
  - Đổi provider (từ Novu sang hệ khác) chỉ cần implement adapter mới cho `NotificationGateway` interface.


