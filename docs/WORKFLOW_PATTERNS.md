# Tài Liệu: Workflow Patterns và Best Practices

## Mục Lục

1. [Tổng Quan Workflows](#tổng-quan-workflows)
2. [Workflow Patterns](#workflow-patterns)
3. [Code-First vs Dashboard](#code-first-vs-dashboard)
4. [Advanced Patterns](#advanced-patterns)
5. [Best Practices](#best-practices)

---

## Tổng Quan Workflows

### 1.1. Workflow là gì?

Workflow trong Novu là một chuỗi các bước (steps) được thực thi tuần tự để gửi thông báo qua một hoặc nhiều kênh. Mỗi workflow có thể:

- Gửi thông báo qua nhiều kênh
- Có điều kiện (conditions)
- Có delay (trì hoãn)
- Có digest (tổng hợp)
- Có branching logic

### 1.2. Workflow Components

```
Workflow
├── Trigger (Event)
├── Steps
│   ├── In-App Notification
│   ├── Delay
│   ├── Condition
│   ├── Email
│   ├── SMS
│   └── Push
└── Output
```

### 1.3. Workflow Lifecycle

```
1. Trigger Event
   ↓
2. Evaluate Conditions
   ↓
3. Execute Steps Sequentially
   ↓
4. Check Subscriber Preferences
   ↓
5. Send via Providers
   ↓
6. Track Status
```

---

## Workflow Patterns

> **Gợi ý theo cấp độ**  
> - **Junior**: Pattern 1 – Simple Single Channel, Pattern 2 – Multi-Channel Parallel  
> - **Middle**: Pattern 3 – Sequential with Delay, Pattern 4 – Conditional Branching, Pattern 5 – Digest Pattern  
> - **Senior**: Pattern 6 – Fallback Chain, mục `Advanced Patterns`  
> - **Principal**: Kết hợp nhiều patterns, áp dụng cho nhiều domain, thêm monitoring & governance

### 2.1. Pattern 1: Simple Single Channel

**Mô tả**: Gửi thông báo qua một kênh duy nhất.

**Use Case**: Email xác nhận đơn hàng, SMS OTP

**Workflow Structure**:
```
Trigger → Email Step → End
```

**Code Example**:
```typescript
// Dashboard workflow hoặc code-first
const orderConfirmationWorkflow = workflow(
  'order-confirmation',
  async ({ payload, step }) => {
    await step.email('send-confirmation', async () => ({
      subject: `Order Confirmation - ${payload.orderNumber}`,
      body: `
        <h1>Thank you for your order!</h1>
        <p>Order Number: ${payload.orderNumber}</p>
        <p>Total: ${payload.totalAmount}</p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      orderNumber: z.string(),
      totalAmount: z.string(),
    }),
  },
);
```

**Module Usage**:
```typescript
await notificationService.sendNotification({
  to: { subscriberId: userId, email: userEmail },
  workflowId: 'order-confirmation',
  payload: {
    orderNumber: 'ORD-12345',
    totalAmount: '$99.99',
  },
});
```

---

### 2.2. Pattern 2: Multi-Channel Parallel

**Mô tả**: Gửi thông báo qua nhiều kênh cùng lúc.

**Use Case**: Thông báo quan trọng cần đảm bảo user nhận được

**Workflow Structure**:
```
Trigger → [In-App, Email, Push] (Parallel) → End
```

**Code Example**:
```typescript
const importantNotificationWorkflow = workflow(
  'important-update',
  async ({ payload, step }) => {
    // Execute in parallel
    await Promise.all([
      step.inApp('in-app-notification', async () => ({
        title: payload.title,
        body: payload.message,
      })),
      step.email('email-notification', async () => ({
        subject: payload.title,
        body: `<p>${payload.message}</p>`,
      })),
      step.push('push-notification', async () => ({
        title: payload.title,
        body: payload.message,
      })),
    ]);
  },
);
```

**Module Usage**:
```typescript
await notificationService.sendNotification({
  to: {
    subscriberId: userId,
    email: userEmail,
  },
  workflowId: 'important-update',
  payload: {
    title: 'Account Security Alert',
    message: 'Your password has been changed successfully',
  },
});
```

---

### 2.3. Pattern 3: Sequential with Delay

**Mô tả**: Gửi thông báo tuần tự với delay giữa các bước.

**Use Case**: Reminder notifications, follow-up emails

**Workflow Structure**:
```
Trigger → Email → Delay (24h) → Follow-up Email → End
```

**Code Example**:
```typescript
const reminderWorkflow = workflow(
  'payment-reminder',
  async ({ payload, step }) => {
    // First reminder
    await step.email('first-reminder', async () => ({
      subject: 'Payment Reminder',
      body: 'Your payment is due in 3 days',
    }));

    // Wait 24 hours
    await step.delay('wait-24h', async () => ({
      amount: 24,
      unit: 'hours',
    }));

    // Second reminder
    await step.email('second-reminder', async () => ({
      subject: 'Payment Due Tomorrow',
      body: 'Your payment is due tomorrow',
    }));
  },
);
```

**Module Usage**:
```typescript
await notificationService.sendNotification({
  to: { subscriberId: userId, email: userEmail },
  workflowId: 'payment-reminder',
  payload: {},
});
```

---

### 2.4. Pattern 4: Conditional Branching

**Mô tả**: Gửi thông báo khác nhau dựa trên điều kiện.

**Use Case**: VIP vs Regular users, Premium vs Free

**Workflow Structure**:
```
Trigger → Condition → [Branch A, Branch B] → End
```

**Code Example**:
```typescript
const welcomeWorkflow = workflow(
  'welcome-email',
  async ({ payload, step, subscriber }) => {
    const isPremium = subscriber.data?.isPremium || false;

    if (isPremium) {
      await step.email('premium-welcome', async () => ({
        subject: 'Welcome to Premium!',
        body: `
          <h1>Welcome, ${subscriber.firstName}!</h1>
          <p>Thank you for upgrading to Premium.</p>
          <p>Your benefits:</p>
          <ul>
            <li>Priority support</li>
            <li>Advanced features</li>
          </ul>
        `,
      }));
    } else {
      await step.email('regular-welcome', async () => ({
        subject: 'Welcome!',
        body: `
          <h1>Welcome, ${subscriber.firstName}!</h1>
          <p>Get started with our free features.</p>
          <p><a href="/upgrade">Upgrade to Premium</a></p>
        `,
      }));
    }
  },
);
```

**Module Usage**:
```typescript
// Create subscriber with data
await notificationService.createSubscriber({
  subscriberId: userId,
  email: userEmail,
  firstName: 'John',
  data: {
    isPremium: true, // or false
  },
});

await notificationService.sendNotification({
  to: { subscriberId: userId },
  workflowId: 'welcome-email',
  payload: {},
});
```

---

### 2.5. Pattern 5: Digest Pattern

**Mô tả**: Tổng hợp nhiều thông báo và gửi theo lịch.

**Use Case**: Daily/weekly digest, comment summaries

**Workflow Structure**:
```
Trigger → In-App → Digest (Collect) → Delay → Email Digest → End
```

**Code Example**:
```typescript
const commentDigestWorkflow = workflow(
  'comment-digest',
  async ({ payload, step }) => {
    // Immediate in-app notification
    await step.inApp('new-comment', async () => ({
      title: 'New Comment',
      body: `${payload.commenterName} commented on your post`,
    }));

    // Collect comments for digest
    const digest = await step.digest('daily-digest', async () => ({
      cron: CronExpression.EVERY_DAY_AT_9AM,
    }));

    // Send digest email if there are comments
    await step.email(
      'daily-comment-digest',
      async (controls) => ({
        subject: `${controls.subjectPrefix} - ${digest.events.length} new comments`,
        body: `
          <h1>Daily Comment Summary</h1>
          <p>You have ${digest.events.length} new comments:</p>
          <ul>
            ${digest.events
              .map(
                (event) =>
                  `<li>${event.payload.commenterName}: ${event.payload.comment}</li>`,
              )
              .join('')}
          </ul>
        `,
      }),
      {
        skip: () => digest.events.length === 0,
        controlSchema: z.object({
          subjectPrefix: z.string().default('Daily Summary'),
        }),
      },
    );
  },
);
```

**Module Usage**:
```typescript
// Each comment triggers the workflow
await notificationService.sendNotification({
  to: { subscriberId: postAuthorId },
  workflowId: 'comment-digest',
  payload: {
    commenterName: 'Jane Doe',
    comment: 'Great post!',
    postId: 'post-123',
  },
});

// Novu will automatically collect and send digest
```

---

### 2.6. Pattern 6: Fallback Chain

**Mô tả**: Thử kênh này, nếu fail thì fallback sang kênh khác.

**Use Case**: Critical notifications cần đảm bảo delivery

**Workflow Structure**:
```
Trigger → Push → (If fail) → Email → (If fail) → SMS → End
```

**Code Example**:
```typescript
const criticalAlertWorkflow = workflow(
  'critical-alert',
  async ({ payload, step }) => {
    // Try push first
    const pushResult = await step.push('push-alert', async () => ({
      title: payload.title,
      body: payload.message,
    }));

    // If push fails or not delivered, try email
    if (pushResult.status !== 'sent') {
      await step.email('email-fallback', async () => ({
        subject: payload.title,
        body: payload.message,
      }));
    }

    // Last resort: SMS
    if (pushResult.status !== 'sent') {
      await step.sms('sms-fallback', async () => ({
        body: `${payload.title}: ${payload.message}`,
      }));
    }
  },
);
```

---

### 2.7. Pattern 7: A/B Testing

**Mô tả**: Gửi các version khác nhau để test hiệu quả.

**Workflow Structure**:
```
Trigger → Random (50/50) → [Version A, Version B] → End
```

**Code Example**:
```typescript
const abTestWorkflow = workflow(
  'welcome-ab-test',
  async ({ payload, step, subscriber }) => {
    // Random A/B test
    const variant = Math.random() < 0.5 ? 'A' : 'B';

    if (variant === 'A') {
      await step.email('version-a', async () => ({
        subject: 'Welcome! Start Your Journey',
        body: '<h1>Welcome!</h1><p>Get started today.</p>',
      }));
    } else {
      await step.email('version-b', async () => ({
        subject: 'Welcome! Unlock Your Potential',
        body: '<h1>Welcome!</h1><p>Discover amazing features.</p>',
      }));
    }
  },
);
```

---

## Code-First vs Dashboard

### 3.1. Dashboard Approach

**Ưu điểm**:
- Non-technical team có thể chỉnh sửa
- Visual workflow builder
- Dễ test và preview
- Không cần deploy code

**Nhược điểm**:
- Khó version control
- Khó review changes
- Khó maintain ở scale lớn
- Khó test tự động

**Khi nào dùng**:
- Team có non-technical members
- Workflows thay đổi thường xuyên
- Prototyping nhanh

### 3.2. Code-First Approach

**Ưu điểm**:
- Version control (Git)
- Code review
- Type safety
- Testable
- Maintainable ở scale lớn
- CI/CD integration

**Nhược điểm**:
- Cần technical knowledge
- Cần deploy để thay đổi
- Setup phức tạp hơn

**Khi nào dùng**:
- Team technical
- Workflows ổn định
- Cần maintainability cao
- Enterprise projects

### 3.3. Hybrid Approach

Sử dụng cả hai:
- **Code-first** cho workflows ổn định, core features
- **Dashboard** cho marketing campaigns, A/B tests

---

## Advanced Patterns

### 4.1. Pattern: Workflow Chaining

Gọi workflow từ workflow khác:

```typescript
const orderWorkflow = workflow(
  'order-placed',
  async ({ payload, step }) => {
    await step.email('order-confirmation', async () => ({
      subject: 'Order Confirmed',
      body: 'Your order has been placed',
    }));

    // Trigger another workflow
    await step.trigger('inventory-update', {
      orderId: payload.orderId,
      items: payload.items,
    });
  },
);
```

### 4.2. Pattern: Dynamic Channel Selection

Chọn kênh dựa trên subscriber preferences:

```typescript
const smartNotificationWorkflow = workflow(
  'smart-notification',
  async ({ payload, step, subscriber }) => {
    const preferences = await getSubscriberPreferences(subscriber.subscriberId);

    if (preferences.email.enabled) {
      await step.email('email-notification', async () => ({
        subject: payload.title,
        body: payload.message,
      }));
    }

    if (preferences.push.enabled) {
      await step.push('push-notification', async () => ({
        title: payload.title,
        body: payload.message,
      }));
    }
  },
);
```

### 4.3. Pattern: Rate Limiting

Giới hạn số lượng notifications:

```typescript
const rateLimitedWorkflow = workflow(
  'rate-limited-notification',
  async ({ payload, step, subscriber }) => {
    const notificationCount = await getNotificationCount(
      subscriber.subscriberId,
      '24h',
    );

    if (notificationCount < 10) {
      await step.email('send-notification', async () => ({
        subject: payload.title,
        body: payload.message,
      }));
    } else {
      // Skip or send to different channel
      console.log('Rate limit exceeded');
    }
  },
);
```

---

## Best Practices

### 5.1. Naming Conventions

```typescript
// Good
'order-confirmation-email'
'payment-reminder-day-1'
'welcome-email-premium'

// Bad
'workflow1'
'email1'
'notification'
```

### 5.2. Payload Schema Validation

Luôn validate payload:

```typescript
const workflow = workflow(
  'order-confirmation',
  async ({ payload, step }) => {
    // payload đã được validate
    await step.email('confirmation', async () => ({
      subject: `Order ${payload.orderNumber}`,
      body: `Total: ${payload.totalAmount}`,
    }));
  },
  {
    payloadSchema: z.object({
      orderNumber: z.string(),
      totalAmount: z.string(),
      items: z.array(
        z.object({
          name: z.string(),
          quantity: z.number(),
          price: z.string(),
        }),
      ),
    }),
  },
);
```

### 5.3. Error Handling

```typescript
const workflow = workflow(
  'notification',
  async ({ payload, step }) => {
    try {
      await step.email('send-email', async () => ({
        subject: payload.subject,
        body: payload.body,
      }));
    } catch (error) {
      // Log error
      console.error('Email failed:', error);
      
      // Fallback
      await step.sms('sms-fallback', async () => ({
        body: payload.body,
      }));
    }
  },
);
```

### 5.4. Testing Workflows

```typescript
// Unit test workflow logic
describe('Order Confirmation Workflow', () => {
  it('should send email with order details', async () => {
    const mockStep = {
      email: jest.fn(),
    };

    await orderConfirmationWorkflow({
      payload: {
        orderNumber: 'ORD-123',
        totalAmount: '$99.99',
      },
      step: mockStep,
      subscriber: { subscriberId: 'user-1' },
    });

    expect(mockStep.email).toHaveBeenCalledWith(
      'send-confirmation',
      expect.any(Function),
    );
  });
});
```

### 5.5. Monitoring và Analytics

Track workflow performance:

```typescript
const workflow = workflow(
  'notification',
  async ({ payload, step }) => {
    const startTime = Date.now();

    await step.email('send-email', async () => ({
      subject: payload.subject,
      body: payload.body,
    }));

    const duration = Date.now() - startTime;
    
    // Track metrics
    trackMetric('workflow.duration', duration);
    trackMetric('workflow.email.sent', 1);
  },
);
```

### 5.6. Documentation

Document mỗi workflow:

```typescript
/**
 * Order Confirmation Workflow
 * 
 * Sends email confirmation when an order is placed.
 * 
 * @payload
 * - orderNumber: string - Order number
 * - totalAmount: string - Total amount
 * - items: Array - Order items
 * 
 * @channels
 * - Email
 * 
 * @triggers
 * - OrderService.createOrder()
 */
const orderConfirmationWorkflow = workflow(
  'order-confirmation',
  // ...
);
```

---

## Tổng Kết

Workflow patterns cung cấp các mẫu thiết kế để xây dựng notification workflows hiệu quả:

1. **Simple patterns** cho use cases cơ bản
2. **Advanced patterns** cho use cases phức tạp
3. **Best practices** để maintain và scale

Chọn pattern phù hợp với use case và team của bạn. Kết hợp nhiều patterns khi cần thiết.

---

**Ngày tạo**: 2025-01-16  
**Phiên bản**: 1.0.0

