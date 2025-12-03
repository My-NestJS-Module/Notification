## Hướng dẫn triển khai (Implementation Guide)

> Mục tiêu: Từng bước triển khai backend NestJS dùng Novu để gửi/đọc thông báo, trong đó **NestJS là API proxy** kiểm soát quyền xem thông báo. Phần này chia theo 4 cấp độ: Junior, Middle, Senior, Principal.

---

## 1. Chuẩn bị môi trường

### 1.1. Cài đặt và cấu hình Novu (Junior/Middle)

1. Đăng ký tài khoản Novu Cloud hoặc tự host (theo docs chính thức):
   - **How Novu works – Novu Documentation**  
     `https://docs.novu.co/platform/how-novu-works` (truy cập: 2025-12-02)

2. Tạo Project & lấy:
   - `NOVU_API_KEY`
   - (Nếu cần) `APP_ID` hoặc các thông số khác tuỳ SDK.

3. Cài CLI (tuỳ chọn):
   ```bash
   npm install -g novu
   novu login
   ```

4. Tạo workflow cơ bản cho một use case (ví dụ: `task_created`).

### 1.2. Chuẩn bị NestJS project

```bash
npm install @nestjs/common @nestjs/core @nestjs/platform-express
npm install @nestjs/jwt passport @nestjs/passport
# ORM tùy chọn, ví dụ Prisma
npm install @prisma/client
```

Thêm env:

```env
NOVU_API_KEY=xxx
NOVU_BASE_URL=https://api.novu.co
JWT_SECRET=your_jwt_secret
```

---

## 2. Cấp độ Junior – Flow cơ bản, 1 user = 1 subscriber

### 2.1. Mục tiêu

- Map `User` ↔ `Subscriber` trong Novu (1–1).
- Gửi 1 loại thông báo đơn giản (ví dụ: `task_created`) cho chính user đó.
- Xây dựng API:
  - `POST /tasks` → tạo task + gửi notification.
  - `GET /notifications` → lấy thông báo của user hiện tại (đơn giản, chưa filter phức tạp).

### 2.2. Bước triển khai

1. **Tạo module Notification**:
   - `NotificationModule`
   - `NotificationService`:
     - Hàm `createSubscriberIfNotExists(user)` – gọi Novu tạo subscriber.
     - Hàm `triggerTaskCreated(user, payload)` – gọi Novu trigger workflow.

2. **Tích hợp trong Use Case** (ví dụ `TaskService.createTask`):
   - Sau khi `task` được tạo thành công:
     - Gọi `notificationService.triggerTaskCreated(assignee, { taskId, title, ... })`.

3. **Xây dựng API đọc thông báo** (chọn 1 trong 2 cách):

   **Cách A: Hybrid – API lấy HMAC cho Inbox component**:
   - `NotificationController.getHmac(req.user)`:
     - Xác thực user bằng `JwtAuthGuard`.
     - Tạo `subscriberHash` bằng HMAC từ `subscriberId = user.id` + secret.
     - Trả về: `{ subscriberId: user.id, subscriberHash }`.
   - Frontend dùng Novu Inbox component với `subscriberId` và `subscriberHash` từ API.

   **Cách B: Full Proxy – API trả về danh sách notification**:
   - `NotificationController.getMyNotifications(req.user)`:
     - Xác thực user bằng `JwtAuthGuard`.
     - Dùng `notificationService.listForSubscriber(req.user.id)`:
       - Hàm này gọi Novu `GET` feed dựa trên `subscriberId`.
     - Trả về JSON danh sách notification.
   - Frontend tự render UI từ JSON.

Junior chỉ cần nhớ:
- Không dùng `NOVU_API_KEY` ở frontend.
- Luôn dùng `req.user.id` làm `subscriberId`.
- Backend kiểm soát quyền bằng cách chỉ trigger notification cho user được phép.

---

## 3. Cấp độ Middle – Topics & role-based / group-based

### 3.1. Mục tiêu

- Dùng **topic** để gửi thông báo cho nhiều user:
  - Ví dụ: tất cả thành viên trong project, tất cả user thuộc 1 tenant, hoặc tất cả user có role `MANAGER`.
- Bắt đầu tách logic ra `NotificationAppService` / `NotificationFacade`.

### 3.2. Bước triển khai

1. **Thiết kế topic key convention**
   - `project:<projectId>:members`
   - `tenant:<tenantId>:all`
   - `role:ADMIN`

2. **Bổ sung hàm trong NotificationService**:
   - `ensureTopicExists(topicKey)`
   - `addSubscriberToTopic(subscriberId, topicKey)`
   - `triggerToTopic(workflowId, topicKey, payload)`

3. **Tạo Application Service (facade)**:
   - `NotificationAppService`:
     - `notifyTaskCreated(task, contextUser)`:
       - Tạo/đảm bảo topic project members tồn tại.
       - Thêm các user thuộc project vào topic (hoặc cập nhật định kỳ qua job).
       - Trigger workflow tới topic đó.

4. **API đọc thông báo theo entity** (ví dụ `GET /projects/:id/notifications`):
   - Guard kiểm tra:
     - `user` có thuộc project không?
   - Nếu có, sử dụng:
     - Tag/topic để filter notification liên quan đến project đó.

Middle tập trung:
- Hiểu rõ topic & subscriber trong Novu.
- Tách nhẹ logic thành AppService + Service infra.

---

## 4. Cấp độ Senior – Domain service, policy & test

### 4.1. Mục tiêu

- Tách domain rõ ràng:
  - `NotificationPolicy`:
    - Quyết định **ai được xem** loại thông báo nào.
    - Ví dụ: 
      - `canViewNotification(user, notificationContext)` 
      - `canViewProjectNotifications(user, projectId)`.
  - `NotificationDomainService`:
    - Xử lý domain event → xác định **list target** (subscribers/topics).
- Viết **unit test** cho policy & domain service.

### 4.2. Bước triển khai

1. **Định nghĩa context**
   - `NotificationContext`:
     - `userId`, `roles`, `tenantId`, `entityType`, `entityId`, …

2. **Viết `NotificationPolicy`**
   - Ví dụ rule:
     - Nếu notification gắn với `projectId`:
       - Chỉ cho phép user là:
         - Owner của project.
         - Member của project.
         - Hoặc có quyền global `NOTIFICATION:VIEW_ALL`.

3. **Integration với controller**
   - Trong `NotificationController`:
     - Trước khi gọi `NovuGateway`, gọi `notificationPolicy` để validate.
     - Nếu không được phép → throw `ForbiddenException`.

4. **Testing**
   - Viết test cho policy:
     - User cùng tenant, khác tenant, role khác nhau, v.v.
   - Viết test cho domain service:
     - Với `TaskCreatedEvent`, target list phải đúng (owner + assignee + watchers).

Senior đảm bảo:
- Logic phân quyền không nằm tản mát trong controller/service.
- Có test bảo vệ các rule chính.

---

## 5. Cấp độ Principal – Multi-tenant, audit & extensibility

### 5.1. Mục tiêu

- Thiết kế để:
  - Hỗ trợ multi-tenant isolation.
  - Có audit log: ai được gửi/đọc thông báo, lúc nào.
  - Dễ dàng đổi provider (Novu → X) hoặc thêm provider.

### 5.2. Bước triển khai

1. **Multi-tenant**
   - Mọi topic, subscriber mapping đều có `tenantId`.
   - `NotificationPolicy` luôn check `tenantId`:
     - `user.tenantId === notification.tenantId`.

2. **Audit logging**
   - Bảng `notification_logs`:
     - `id`, `userId`, `operation` (`SEND`, `READ`), `notificationId`, `entityId`, `timestamp`, `ip`, …
   - Khi:
     - Trigger: ghi log `SEND`.
     - API đọc: ghi log `READ`.

3. **Abstraction layer**
   - Định nghĩa interface `NotificationProvider`:
     - `trigger(workflowId, target, payload)`
     - `getFeed(subscriberId, filters)`
   - Implement `NovuNotificationProvider` dùng Novu.
   - Sau này nếu cần, có thể thêm MongoDB-based provider, v.v.

4. **Policy engine**
   - Thay vì hard-code rule, xem xét dùng:
     - CASL, hoặc
     - Policy DSL đơn giản (lưu trong DB).
   - Cho phép admin sửa rule **mà không phải deploy lại**.

Principal tập trung:
- Đảm bảo kiến trúc **ổn định lâu dài**, dễ mở rộng, dễ thay đổi provider, an toàn cho multi-tenant.

---

## 6. Checklist nhanh theo cấp độ

### Junior
- [ ] Biết map `user.id` → `subscriberId`.
- [ ] Gọi Novu để gửi một loại notification đơn giản.
- [ ] Xây `GET /notifications` trả thông báo của chính user.

### Middle
- [ ] Dùng topic để gửi cho nhóm user.
- [ ] Có `NotificationAppService` để gom logic.
- [ ] Bắt đầu filter notification theo entity (project, tenant…).

### Senior
- [ ] Có `NotificationPolicy` tách biệt.
- [ ] Domain service nhận event → target list chuẩn.
- [ ] Test cho policy và domain service.

### Principal
- [ ] Multi-tenant isolation, naming topic/subject rõ ràng.
- [ ] Audit logging send/read notification.
- [ ] Provider abstraction, có thể đổi Novu nếu cần.
- [ ] Policy engine cấu hình được (không hard-code).

---

## 7. Chi tiết triển khai 2 cách tiếp cận

### 7.1. Cách 1: Hybrid – Novu Inbox Component + HMAC

#### 7.1.1. Backend: API lấy HMAC

**Junior/Middle**:
```typescript
// notification.controller.ts
@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get('hmac')
  @UseGuards(JwtAuthGuard)
  async getHmac(@CurrentUser() user: User) {
    const subscriberId = user.id.toString();
    const subscriberHash = this.notificationService.generateHmac(subscriberId);
    return { subscriberId, subscriberHash };
  }
}

// notification.service.ts
generateHmac(subscriberId: string): string {
  const secret = process.env.NOVU_HMAC_SECRET; // Lưu trong .env
  return crypto
    .createHmac('sha256', secret)
    .update(subscriberId)
    .digest('hex');
}
```

**Senior/Principal**:
- Thêm policy check: `canViewNotifications(user)`.
- Log audit: ai đã lấy HMAC, lúc nào.
- Có thể cache HMAC (với TTL ngắn) để giảm tính toán.

#### 7.1.2. Frontend: Dùng Novu Inbox Component

**React example**:
```tsx
// App.tsx hoặc NotificationBell.tsx
import { NovuProvider, PopoverNotificationCenter } from '@novu/react';
import { useEffect, useState } from 'react';

function NotificationBell() {
  const [hmac, setHmac] = useState<{ subscriberId: string; subscriberHash: string } | null>(null);

  useEffect(() => {
    // Gọi API backend để lấy HMAC
    fetch('/api/notifications/hmac', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(setHmac);
  }, []);

  if (!hmac) return <div>Loading...</div>;

  return (
    <NovuProvider
      subscriberId={hmac.subscriberId}
      subscriberHash={hmac.subscriberHash}
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_ID}
    >
      <PopoverNotificationCenter />
    </NovuProvider>
  );
}
```

**Lưu ý**:
- `NOVU_APP_ID` có thể public (không phải secret).
- `subscriberHash` phải lấy từ backend (không tự tính ở frontend).
- Component tự động kết nối Novu và lấy notification của `subscriberId` đó.

#### 7.1.3. Backend kiểm soát quyền (quan trọng)

**Quyền xem notification được kiểm soát ở bước trigger**:
- Khi có sự kiện (ví dụ: task mới), backend tính toán "ai được nhận notification".
- Backend chỉ trigger Novu cho những subscriber/topic hợp lệ.
- → User chỉ nhận được notification mà backend đã gửi cho họ.
- → Khi mở Inbox, user chỉ thấy notification của chính mình (vì backend chỉ gửi cho họ).

**Ví dụ**:
```typescript
// task.service.ts
async createTask(data: CreateTaskDto, userId: string) {
  const task = await this.taskRepo.create({ ...data, createdBy: userId });
  
  // Backend quyết định ai được nhận notification
  const assignee = await this.userRepo.findById(data.assigneeId);
  const projectMembers = await this.projectRepo.getMembers(data.projectId);
  
  // Chỉ gửi cho assignee và creator (nếu khác assignee)
  const targets = [assignee.id];
  if (assignee.id !== userId) {
    targets.push(userId);
  }
  
  // Trigger Novu chỉ cho những user này
  await this.notificationService.triggerTaskCreated(targets, {
    taskId: task.id,
    title: task.title,
  });
  
  return task;
}
```

### 7.2. Cách 2: Full Proxy – NestJS API Proxy

#### 7.2.1. Backend: API trả về danh sách notification

**Junior/Middle**:
```typescript
// notification.controller.ts
@Controller('notifications')
export class NotificationController {
  constructor(private notificationService: NotificationService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getMyNotifications(
    @CurrentUser() user: User,
    @Query('limit') limit: number = 20,
    @Query('cursor') cursor?: string,
  ) {
    // Chỉ lấy notification của chính user đó
    return this.notificationService.listForSubscriber(
      user.id.toString(),
      { limit, cursor }
    );
  }
}

// notification.service.ts
async listForSubscriber(
  subscriberId: string,
  options: { limit: number; cursor?: string }
) {
  // Gọi Novu API để lấy feed
  const response = await axios.get(
    `${NOVU_BASE_URL}/v1/subscribers/${subscriberId}/notifications/feed`,
    {
      headers: { 'Api-Key': process.env.NOVU_API_KEY },
      params: { limit: options.limit, cursor: options.cursor },
    }
  );
  return response.data;
}
```

**Senior/Principal**:
- Thêm policy check: `canViewNotifications(user, filters)`.
- Filter theo entity: `GET /notifications?entityType=project&entityId=123`.
- Kiểm tra quyền trên entity trước khi query Novu.
- Log audit: ai đã đọc notification nào, lúc nào.

**Ví dụ với filter theo entity**:
```typescript
@Get()
@UseGuards(JwtAuthGuard)
async getNotifications(
  @CurrentUser() user: User,
  @Query('entityType') entityType?: string,
  @Query('entityId') entityId?: string,
  @Query('limit') limit: number = 20,
) {
  // Kiểm tra quyền trên entity (nếu có)
  if (entityType && entityId) {
    const hasPermission = await this.notificationPolicy.canViewEntityNotifications(
      user,
      entityType,
      entityId
    );
    if (!hasPermission) {
      throw new ForbiddenException();
    }
  }
  
  // Query Novu với filter
  return this.notificationService.listForSubscriber(
    user.id.toString(),
    { limit, entityType, entityId }
  );
}
```

#### 7.2.2. Frontend: Tự build UI

**React example**:
```tsx
function NotificationList() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notifications?limit=20', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setNotifications(data.data);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {notifications.map(notif => (
        <NotificationItem key={notif._id} notification={notif} />
      ))}
    </div>
  );
}
```

**Nếu cần real-time**:
- Có thể dùng WebSocket hoặc polling.
- Hoặc dùng Novu WebSocket SDK (nhưng vẫn phải authenticate qua backend).

#### 7.2.3. So sánh và khuyến nghị

| Tình huống | Khuyến nghị |
|------------|-------------|
| Quyền đơn giản (user chỉ xem của chính mình) | **Hybrid** (Inbox + HMAC) |
| Quyền phức tạp (user chỉ xem notification của project họ là member) | **Full Proxy** (API NestJS) |
| Cần audit log chi tiết | **Full Proxy** |
| Muốn UI nhanh, không custom nhiều | **Hybrid** |
| Muốn custom UI hoàn toàn | **Full Proxy** |
| Kết hợp cả 2 | Dùng **Hybrid** cho user thường, **Full Proxy** cho admin/quản trị |

**Lưu ý quan trọng**:
- Dù chọn cách nào, **backend luôn kiểm soát quyền ở bước trigger** (chỉ gửi notification cho user được phép).
- Với **Hybrid**, quyền được kiểm soát hoàn toàn ở bước trigger → user chỉ thấy notification của mình trong Inbox.
- Với **Full Proxy**, quyền được kiểm soát ở cả trigger + API đọc → backend filter khi query.


