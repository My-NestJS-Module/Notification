## Mức Junior – Hướng dẫn tái sử dụng & mở rộng cơ bản

### Mục tiêu
- **Biết cách**:
  - Gửi lại nhiều loại email/SMS khác nhau nhưng dùng **cùng một service**.
  - Thêm use case mới mà **không copy-paste code**.

### Nguyên tắc đơn giản
- **1. Một service gửi thông báo duy nhất**:
  - `NotificationsService` chịu trách nhiệm gọi Novu.
  - Code ở các module khác chỉ gọi `notificationsService.sendXxx()`.
- **2. DTO rõ ràng**:
  - Với mỗi use case, chuẩn hóa DTO đầu vào: email, sms, payload.
- **3. Dùng `templateName` / `workflowId`** thay vì hard-code nội dung.

### Cách tái sử dụng cho nhiều template
- Tạo **một method chung** `sendMultiChannel()`:

```typescript
async sendMultiChannel(options: {
  templateName: string;
  email?: string;
  phone?: string;
  payload: Record<string, any>;
}) {
  return this.triggerNovu({
    name: options.templateName,
    to: {
      subscriberId: options.payload.userId ?? options.email ?? options.phone,
      email: options.email,
      phone: options.phone,
    },
    payload: options.payload,
  });
}
```

Sau đó, ở **các module khác**, chỉ việc:

```typescript
await this.notificationsService.sendMultiChannel({
  templateName: 'user-registration',
  email: user.email,
  payload: { userId: user.id, name: user.fullName },
});
```

### Thêm use case mới (ví dụ: nhắc gia hạn)
1. Tạo workflow mới trên Novu: `subscription-renewal-reminder`.
2. Thêm method “wrapper” cho dễ đọc (tùy chọn):

```typescript
async sendSubscriptionRenewalReminder(user: User, daysLeft: number) {
  return this.sendMultiChannel({
    templateName: 'subscription-renewal-reminder',
    email: user.email,
    phone: user.phone,
    payload: {
      userId: user.id,
      fullName: user.fullName,
      daysLeft,
    },
  });
}
```

3. Từ Cron job / Billing module chỉ cần gọi method này.

---

## Mức Middle – Tổ chức code để dễ mở rộng

### Tách interface để dễ thay nhà cung cấp (Novu vs khác)
- Định nghĩa một interface chung:

```typescript
export interface INotificationGateway {
  sendEmail(params: {
    to: string;
    templateName: string;
    payload: Record<string, any>;
  }): Promise<void>;

  sendSms(params: {
    to: string;
    templateName: string;
    payload: Record<string, any>;
  }): Promise<void>;
}
```

- Implement bằng Novu:

```typescript
export class NovuNotificationGateway implements INotificationGateway {
  // inject config + http client...

  async sendEmail(params: { to: string; templateName: string; payload: any }) {
    await this.trigger({
      name: params.templateName,
      to: { subscriberId: params.to, email: params.to },
      payload: params.payload,
    });
  }

  async sendSms(params: { to: string; templateName: string; payload: any }) {
    await this.trigger({
      name: params.templateName,
      to: { subscriberId: params.to, phone: params.to },
      payload: params.payload,
    });
  }

  private async trigger(body: any) {
    // call Novu API
  }
}
```

- **Lợi ích**:
  - Nếu sau này đổi sang provider khác (hoặc dùng trực tiếp Twilio/SES),
    chỉ cần implement interface khác, không chạm vào business logic.

### Tái sử dụng ở nhiều module domain
- Ở các module như `AuthModule`, `OrdersModule`, `BillingModule`:
  - Chỉ inject `INotificationGateway` hoặc `NotificationsService` đã đóng gói.
  - Không biết chi tiết Novu.

Ví dụ:

```typescript
// auth.service.ts
constructor(
  private readonly notificationGateway: INotificationGateway,
) {}

async registerUser(dto: RegisterDto) {
  const user = await this.usersRepository.create(dto);

  await this.notificationGateway.sendEmail({
    to: user.email,
    templateName: 'user-registration',
    payload: {
      userId: user.id,
      fullName: user.fullName,
    },
  });

  return user;
}
```

### Chiến lược mở rộng
- **Thêm kênh mới (Push, In-App)**:
  - Bổ sung method mới vào `INotificationGateway`: `sendInApp`, `sendPush`.
  - Novu hỗ trợ multi-channel nên chỉ cần update 1 implementation.
- **Thêm workflow mới**:
  - Tạo workflow trên Novu.
  - Thêm method ứng với use case (trong `NotificationsService` hoặc use case layer).

---

## Mức Senior – Hướng dẫn tái sử dụng với Novu Framework & Domain-Driven Design

### Tách Use Case – không để “business” chảy vào gateway
- Mỗi hành vi gửi thông báo là **một Use Case**:
  - `SendWelcomeNotificationUseCase`
  - `SendOrderConfirmationUseCase`
  - `SendPasswordResetNotificationUseCase`

Các use case:
- Nhận **command DTO** (input từ controller/handler).
- Sử dụng repository để load entity (User, Order).
- Build `NotificationPayload` domain-friendly.
- Gọi `INotificationGateway`.

Ví dụ:

```typescript
export class SendOrderConfirmationUseCase {
  constructor(
    private readonly ordersRepo: OrdersRepository,
    private readonly notificationGateway: INotificationGateway,
  ) {}

  async execute(command: { orderId: string }) {
    const order = await this.ordersRepo.findByIdOrFail(command.orderId);
    const user = order.user;

    await this.notificationGateway.sendEmail({
      to: user.email,
      templateName: 'order-confirmation',
      payload: {
        orderId: order.id,
        amount: order.total.toFixed(2),
        fullName: user.fullName,
      },
    });

    if (user.phone) {
      await this.notificationGateway.sendSms({
        to: user.phone,
        templateName: 'order-confirmation',
        payload: {
          orderId: order.id,
          amount: order.total.toFixed(2),
        },
      });
    }
  }
}
```

### Reuse bằng Novu Framework (code-first workflows)
- Thay vì tạo workflow qua UI, bạn:
  - Định nghĩa workflow bằng code (`@novu/framework`).
  - Tái sử dụng lại workflow logic giữa nhiều service.

Ví dụ workflow dùng lại cho nhiều luồng order:

```typescript
// workflows/order-updates.ts
export const orderUpdatesWorkflow = workflow(
  'order-updates',
  async ({ payload, step }) => {
    // gửi email
    await step.email('order-status-email', async () => ({
      subject: `Order ${payload.orderId} - ${payload.status}`,
      body: `Current status: ${payload.status}`,
    }));

    // gửi sms ngắn
    if (payload.phone) {
      await step.sms('order-status-sms', async () => ({
        content: `Order ${payload.orderId} is now ${payload.status}`,
      }));
    }
  },
  {
    payloadSchema: z.object({
      orderId: z.string(),
      status: z.string(),
      phone: z.string().optional(),
    }),
  },
);
```

Các use case khác nhau chỉ cần trigger workflow với payload tương ứng:

```typescript
await orderUpdatesWorkflow.trigger({
  to: 'user-123',
  payload: { orderId: 'ORD-1', status: 'CONFIRMED', phone: '+8490...' },
});
```

### Mở rộng theo domain (chứ không phải theo kênh)
- Structuring use case theo **ngôn ngữ domain**:
  - `SendInvoiceIssuedNotification`
  - `SendPaymentFailedNotification`
  - `SendAccountSuspendedNotification`
- Mỗi use case có thể:
  - Gửi nhiều kênh (Email, SMS, Push…).
  - Sử dụng chung `NotificationGateway` + Novu workflows.

---

## Mức Principal – Chiến lược reuse & extension ở mức hệ thống

### Nguyên tắc cốt lõi
- **Notification là platform**, không phải “tiện ích send mail”.
- Tách biệt rõ:
  - **Notification API/Contract** (domain) với
  - **Notification Engine** (Novu + supporting services).

### Reuse cross-product / cross-tenant
- Thiết kế payload & event:
  - Đủ generic để dùng chung giữa nhiều sản phẩm/module.
  - Nhưng vẫn có **naming** sát domain (vd `orderId`, `workspaceId`).
- Sử dụng **feature flag / preferences**:
  - Cho phép bật/tắt các loại thông báo theo product, tenant, user.

### Extension points rõ ràng
- **Ở Backend**:
  - Hook trước & sau khi gửi (pre/post send hooks).
  - Policy engine (ví dụ: không gửi SMS ban đêm).
- **Ở Novu**:
  - Sử dụng **controlSchema** trong Novu Framework để non-dev chỉnh sửa một phần nội dung nhưng vẫn trong khuôn khổ type-safe.

### Chiến lược versioning
- Version hóa:
  - Workflow ID (v1, v2).
  - Template ID.
- Backend:
  - Mapping use case → version phù hợp (theo feature flag / rollout).

### Mô hình refactor dần dần (Strangler pattern)
- Bước 1: Mọi thông báo gọi trực tiếp provider (Sendgrid/Twilio).
- Bước 2: Thêm Novu làm gateway mới, dần chuyển từng use case sang.
- Bước 3: Khi ổn định, tất cả traffic notification đi qua Novu.

### Checklist cho Principal khi thiết kế reuse/mở rộng
- **API thân thiện với domain** (không lộ “Novu-ish” ra bên ngoài).
- **Kênh chỉ là implementation detail**.
- **Observability đầy đủ** (metrics, traces, logs theo correlation-id).
- **Không lock-in quá sâu**:
  - Có abstraction layer (`INotificationGateway`).
  - Dù thực tế 99% là Novu, vẫn có đường thoát.


