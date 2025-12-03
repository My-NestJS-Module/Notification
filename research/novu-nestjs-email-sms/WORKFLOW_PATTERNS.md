## Mức Junior – Workflow Patterns cơ bản với Novu + NestJS

### Mục tiêu
- Nhận diện được **các kiểu luồng phổ biến** khi gửi Email/SMS.
- Biết cách map **Use Case → Workflow** trong Novu.

### Pattern 1 – One-shot Notification (Gửi 1 lần)
- **Mô tả**:
  - Gửi một email hoặc SMS đơn giản ngay khi có sự kiện.
- **Ví dụ**:
  - User đăng ký → gửi email “Welcome”.
  - Đặt hàng thành công → gửi SMS “Order confirmed”.
- **Triển khai**:
  - 1 workflow trên Novu, 1–2 step:
    - Step Email.
    - (Tùy chọn) Step SMS.

```typescript
await this.notificationsService.sendMultiChannel({
  templateName: 'user-registration',
  email: user.email,
  phone: user.phone,
  payload: { userId: user.id, fullName: user.fullName },
});
```

### Pattern 2 – Two-channel Notification (Email + SMS song song)
- **Mô tả**:
  - Gửi đồng thời cả email và SMS cho cùng một sự kiện.
- **Ví dụ**:
  - Nhắc gia hạn dịch vụ: vừa email, vừa SMS.
- **Triển khai**:
  - Trong Novu Workflow:
    - Step 1: Email.
    - Step 2: SMS.
  - Trong backend, pass đầy đủ `email` và `phone`.

### Pattern 3 – OTP / Verification (SMS/Email OTP)
- **Mô tả**:
  - Gửi một mã OTP qua SMS hoặc Email.
- **Đặc trưng**:
  - Có **expiry**, **limit retries**, **rate limiting**.
- **Triển khai basic (Junior)**:
  - Backend sinh OTP, lưu DB/cache.
  - Gửi OTP qua Novu (email/sms).

---

## Mức Middle – Patterns nâng cao hơn & best practices cơ bản

### Pattern 4 – Digest (Tổng hợp nhiều sự kiện thành 1 email)
- **Mô tả**:
  - Thay vì gửi 10 email khi có 10 comment, tổng hợp thành 1 email/ngày.
- **Novu hỗ trợ**:
  - `step.digest` trong Novu Framework, hoặc Digest node trong UI.
- **Back-end**:
  - Gửi event bình thường mỗi lần có sự kiện.
  - Novu tự gom lại theo cron/delay.

### Pattern 5 – Conditional Channel (chọn kênh theo điều kiện)
- **Ví dụ**:
  - Nếu user có Email → gửi Email.
  - Nếu **không có Email nhưng có Phone** → gửi SMS.
  - Nếu có cả 2 → gửi Email, SMS chỉ dùng khi event “critical”.
- **Triển khai**:
  - Ở **backend**, truyền đầy đủ email/phone & `importance`.
  - Ở **workflow**:
    - Step Email: luôn gửi nếu `email` tồn tại.
    - Step SMS: chỉ gửi nếu `importance === 'critical'`.

### Pattern 6 – Retry & Fallback
- **Mô tả**:
  - Nếu gửi Email fail → thử lại hoặc fallback sang SMS.
- **Triển khai cơ bản**:
  - Dùng cơ chế retry của Novu & provider (Sendgrid, Twilio).
  - Có thể thêm step khác trong workflow khi một step fail.

### Best practices (Middle)
- **Không lạm dụng SMS**:
  - Dùng cho thông báo quan trọng (OTP, payment, security).
- **Chuẩn hóa subscriberId**:
  - Ví dụ: `user:${user.id}`.
- **Đặt tên workflow rõ nghĩa**:
  - `user-registration`, `order-confirmation`, `subscription-renewal-reminder`.

---

## Mức Senior – Advanced workflow patterns với Novu Framework

### Pattern 7 – Multi-step Orchestration (Email → Wait → SMS)
- **Mô tả**:
  - Khi xảy ra sự kiện:
    - Gửi **Email trước**.
    - Chờ 30 phút – 24h.
    - Nếu user chưa thực hiện action → gửi **SMS nhắc**.
- **Ví dụ thực tế**:
  - Reset password: email link, nếu không click trong 30 phút → sms nhắc.
- **Triển khai với Novu Framework** (minh họa):

```typescript
const resetPasswordWorkflow = workflow(
  'reset-password',
  async ({ payload, step }) => {
    const emailResult = await step.email('reset-password-email', async () => ({
      subject: 'Reset your password',
      body: `Click here: ${payload.resetLink}`,
    }));

    await step.delay('wait-for-action', () => ({
      amount: 30,
      unit: 'minutes',
    }));

    // nếu user chưa reset (dựa trên data từ payload / external check)
    if (!payload.hasReset && payload.phone) {
      await step.sms('reset-password-sms', async () => ({
        content: 'You requested a password reset. Check your email or request again.',
      }));
    }
  },
  {
    payloadSchema: z.object({
      resetLink: z.string().url(),
      phone: z.string().optional(),
      hasReset: z.boolean().default(false),
    }),
  },
);
```

### Pattern 8 – Routing theo loại user / tenant
- **Mô tả**:
  - Tùy loại user/tenant mà gửi template/kênh khác nhau.
- **Ví dụ**:
  - Tenant A:
    - Chỉ dùng Email (brand riêng).
  - Tenant B:
    - Dùng Email + SMS, template khác.
- **Triển khai**:
  - Payload chứa `tenantId`, `plan`, `preferences`.
  - Trong workflow:
    - `if (payload.tenantId === 'A')` → Step Email A.
    - `if (payload.tenantId === 'B')` → Step Email B + SMS.

### Pattern 9 – Event-driven Notifications (từ message broker)
- **Mô tả**:
  - Thay vì controller gọi trực tiếp notification service, dùng event:
    - `order.created`
    - `payment.failed`
  - Notification service subscribe, trigger workflow tương ứng.
- **Triển khai**:
  - NestJS: dùng `@nestjs/microservices`, `BullMQ`, hoặc Kafka client.
  - Khi nhận event, mapping:

```typescript
switch (event.type) {
  case 'order.created':
    await this.notificationGateway.sendOrderCreated(...);
    break;
  case 'payment.failed':
    await this.notificationGateway.sendPaymentFailed(...);
    break;
}
```

### Advanced Best Practices (Senior)
- **Idempotency**:
  - Dùng `transactionId` khi trigger Novu để tránh gửi trùng.
- **Observability**:
  - Log correlation id (request id, order id, subscriber id).
  - Theo dõi metrics: số lượng gửi, tỉ lệ lỗi, tỉ lệ open/click (nếu có).
- **Backpressure & Rate limit**:
  - Hàng loạt event (sale lớn) → đẩy vào queue, xử lý dần.

---

## Mức Principal – Patterns cấp hệ thống & chiến lược

### Pattern 10 – Central Notification Platform
- **Mô tả**:
  - Xây một **Notification Platform** trung tâm:
    - Nhận mọi event từ toàn hệ thống (multi-service).
    - Orchestrate gửi Email/SMS/Push/In-App qua Novu.
  - Các team product chỉ “đăng ký” event và payload contract.
- **Thành phần**:
  - **Event Bus** (Kafka, RabbitMQ, NATS…).
  - **Notification Service** (NestJS + Novu).
  - **Novu Cloud + Framework** quản lý workflow & template.

### Pattern 11 – Policy-driven Notifications
- **Mô tả**:
  - Gửi thông báo dựa trên **policy** (quy tắc) linh hoạt:
    - Giờ gửi (không gửi SMS ban đêm).
    - Tần suất (max N SMS/ngày).
    - Kênh ưu tiên (email trước, sms sau).
- **Triển khai**:
  - Tách 1 lớp `NotificationPolicyEngine` ở backend:
    - Input: event + user preferences + usage metrics.
    - Output: `allowedChannels`, `throttle`, `blocked`.
  - Kết quả này được pass vào payload cho workflow/Novu.

### Pattern 12 – Compliance & Auditing
- **Mô tả**:
  - Lưu lại đầy đủ:
    - Event đã gửi.
    - Kênh đã dùng (email/sms).
    - Trạng thái (queued, sent, failed).
  - Đảm bảo comply với quy định (GDPR, PDPA…).
- **Triển khai**:
  - Audit log service (hoặc bảng `notification_logs`).
  - Lưu `subscriberId`, `eventName`, `channels`, `status`, `error`.
  - Không lưu nội dung nhạy cảm (PII, token).

### Pattern 13 – Blue/Green Template & Workflow Deployment
- **Mô tả**:
  - Triển khai template/workflow mới cho 1 phần traffic để test.
- **Triển khai**:
  - Giữ 2 version workflow: `order-confirmation-v1`, `order-confirmation-v2`.
  - Backend quyết định:
    - 90% traffic → v1.
    - 10% traffic → v2.
  - Theo dõi metrics open/click/delivery, rồi rollout dần.

### Pattern 14 – Multi-region & Disaster Recovery
- **Mô tả**:
  - Hệ thống notification vẫn hoạt động khi 1 region hoặc 1 provider die.
- **Triển khai**:
  - Dùng **nhiều integration** trong Novu (multi-SMTP, multi-SMS provider).
  - Dùng message queue để **buffer** khi Novu tạm down.
  - Có fallback path (tạm disable SMS, chỉ gửi Email, hoặc ngược lại).

### Principal Best Practices
- **Think in Events & Contracts**, không nghĩ theo “gửi email” đơn lẻ.
- **Đo lường & tối ưu liên tục**:
  - Monitor tỉ lệ gửi thành công, thời gian trễ, chi phí SMS/email.
- **Trao quyền cho non-dev**:
  - Marketing/Product có thể chỉnh template, copy, layout trên Novu
    mà không cần deploy backend mới.


