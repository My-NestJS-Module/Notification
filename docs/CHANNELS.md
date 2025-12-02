# Tài Liệu Chi Tiết: Các Kênh Thông Báo

## Mục Lục

1. [Tổng Quan Các Kênh](#tổng-quan-các-kênh)
2. [Email Channel](#email-channel)
3. [SMS Channel](#sms-channel)
4. [In-App Channel](#in-app-channel)
5. [Push Notification Channel](#push-notification-channel)
6. [Chat Channel](#chat-channel)
7. [Best Practices](#best-practices)

---

## Tổng Quan Các Kênh

Novu hỗ trợ 5 kênh thông báo chính:

| Kênh | Mô Tả | Use Cases | Providers |
|------|-------|-----------|-----------|
| **Email** | Gửi email HTML/text | Xác nhận đơn hàng, báo cáo, newsletter | SendGrid, AWS SES, Mailgun, Postmark, Mandrill |
| **SMS** | Gửi tin nhắn văn bản | OTP, cảnh báo quan trọng, thông báo giao dịch | Twilio, AWS SNS, Plivo, MessageBird |
| **In-App** | Thông báo trong ứng dụng | Thông báo real-time, cập nhật trạng thái | Built-in (Novu Inbox) |
| **Push** | Push notification (Web/Mobile) | Thông báo trên thiết bị, reminders | FCM, APNS, OneSignal |
| **Chat** | Tích hợp với chat platforms | Thông báo team, alerts | Slack, Discord, Microsoft Teams, Mattermost |

---

## Email Channel

### 2.1. Cấu Hình

#### 2.1.1. Setup Provider

1. Vào Novu Dashboard → Integrations
2. Chọn Email provider (ví dụ: SendGrid)
3. Nhập API key/credentials
4. Test connection

#### 2.1.2. Environment Variables

```env
# SendGrid (ví dụ)
SENDGRID_API_KEY=your_sendgrid_api_key

# AWS SES (ví dụ)
AWS_SES_ACCESS_KEY_ID=your_access_key
AWS_SES_SECRET_ACCESS_KEY=your_secret_key
AWS_SES_REGION=us-east-1
```

### 2.2. Workflow Configuration

```typescript
// Trong Novu Dashboard hoặc code-first workflow
{
  workflowId: 'order-confirmation-email',
  steps: [
    {
      type: 'email',
      name: 'send-confirmation',
      template: {
        subject: 'Order Confirmation - {{orderNumber}}',
        body: `
          <h1>Thank you for your order!</h1>
          <p>Order Number: {{orderNumber}}</p>
          <p>Total: {{totalAmount}}</p>
          <p>Items:</p>
          <ul>
            {{#each items}}
            <li>{{name}} - {{quantity}}x {{price}}</li>
            {{/each}}
          </ul>
        `,
      },
    },
  ],
}
```

### 2.3. Sử Dụng trong Module

```typescript
await notificationService.sendNotification({
  to: {
    subscriberId: 'user-123',
    email: 'user@example.com',
    firstName: 'John',
  },
  workflowId: 'order-confirmation-email',
  payload: {
    orderNumber: 'ORD-12345',
    totalAmount: '$99.99',
    items: [
      { name: 'Product 1', quantity: 2, price: '$49.99' },
      { name: 'Product 2', quantity: 1, price: '$29.99' },
    ],
  },
  overrides: {
    email: {
      from: 'orders@example.com',
      replyTo: 'support@example.com',
      bcc: ['archive@example.com'],
    },
  },
});
```

### 2.4. Email Template Variables

Novu sử dụng Handlebars cho email templates:

```handlebars
<!-- Basic variables -->
{{userName}}
{{orderNumber}}
{{totalAmount}}

<!-- Conditional -->
{{#if isPremium}}
  <p>Premium Member Benefits</p>
{{/if}}

<!-- Loops -->
{{#each items}}
  <div>{{name}} - {{price}}</div>
{{/each}}

<!-- Helpers -->
{{formatDate createdAt 'MM/DD/YYYY'}}
{{formatCurrency amount 'USD'}}
```

### 2.5. Email Providers Comparison

| Provider | Pros | Cons | Best For |
|----------|------|------|----------|
| **SendGrid** | Dễ setup, deliverability tốt | Giá cao ở scale lớn | Startups, SMEs |
| **AWS SES** | Giá rẻ, scale tốt | Setup phức tạp hơn | Enterprise, high volume |
| **Mailgun** | API tốt, analytics | Pricing có thể phức tạp | Developers, APIs |
| **Postmark** | Deliverability xuất sắc | Chỉ transactional emails | Transactional emails |
| **Mandrill** | Tích hợp Mailchimp | Phụ thuộc Mailchimp | Mailchimp users |

---

## SMS Channel

### 3.1. Cấu Hình

#### 3.1.1. Setup Provider

1. Đăng ký tài khoản với SMS provider (ví dụ: Twilio)
2. Lấy Account SID và Auth Token
3. Cấu hình trong Novu Dashboard

#### 3.1.2. Phone Number Format

SMS yêu cầu số điện thoại theo định dạng E.164:
- ✅ `+84123456789` (Vietnam)
- ✅ `+12025551234` (US)
- ❌ `0123456789` (thiếu country code)
- ❌ `84-123-456-789` (có dấu gạch ngang)

### 3.2. Workflow Configuration

```typescript
{
  workflowId: 'otp-sms',
  steps: [
    {
      type: 'sms',
      name: 'send-otp',
      template: {
        body: 'Your OTP code is {{otpCode}}. Valid for {{expiresIn}} minutes.',
      },
    },
  ],
}
```

### 3.3. Sử Dụng trong Module

```typescript
await notificationService.sendNotification({
  to: {
    subscriberId: 'user-123',
    phone: '+84123456789', // E.164 format
  },
  workflowId: 'otp-sms',
  payload: {
    otpCode: '123456',
    expiresIn: 5,
  },
  overrides: {
    sms: {
      from: '+12025551234', // Twilio phone number
    },
  },
});
```

### 3.4. SMS Best Practices

1. **Ngắn gọn**: SMS giới hạn 160 ký tự (GSM 7-bit) hoặc 70 ký tự (Unicode)
2. **Rõ ràng**: Tránh viết tắt khó hiểu
3. **Call-to-action**: Bao gồm link hoặc hướng dẫn rõ ràng
4. **Timing**: Tránh gửi vào giờ nghỉ (22:00 - 08:00)
5. **Compliance**: Tuân thủ quy định về spam (opt-in/opt-out)

### 3.5. SMS Providers Comparison

| Provider | Pros | Cons | Best For |
|----------|------|------|----------|
| **Twilio** | Dễ dùng, documentation tốt | Giá cao | Global, developers |
| **AWS SNS** | Giá rẻ, scale tốt | Setup phức tạp | Enterprise, high volume |
| **Plivo** | Giá competitive | Features ít hơn Twilio | Cost-sensitive |
| **MessageBird** | Global coverage tốt | Pricing phức tạp | International |

---

## In-App Channel

### 4.1. Tổng Quan

In-App notifications là thông báo hiển thị trong ứng dụng web/mobile thông qua Novu Inbox component.

### 4.2. Workflow Configuration

```typescript
{
  workflowId: 'comment-notification',
  steps: [
    {
      type: 'in_app',
      name: 'new-comment',
      template: {
        title: 'New Comment',
        body: '{{commenterName}} commented on your post "{{postTitle}}"',
        avatar: '{{commenterAvatar}}',
        redirect: {
          url: '{{postUrl}}',
          target: '_blank',
        },
        data: {
          commentId: '{{commentId}}',
          postId: '{{postId}}',
        },
      },
    },
  ],
}
```

### 4.3. Sử Dụng trong Module

```typescript
await notificationService.sendNotification({
  to: {
    subscriberId: 'user-123',
  },
  workflowId: 'comment-notification',
  payload: {
    commenterName: 'Jane Doe',
    postTitle: 'Getting Started with Novu',
    commenterAvatar: 'https://example.com/avatar.jpg',
    postUrl: 'https://example.com/posts/123',
    commentId: 'comment-456',
    postId: 'post-123',
  },
});
```

### 4.4. Frontend Integration

#### 4.4.1. React Integration

```typescript
// Install
npm install @novu/react

// Usage
import { NovuProvider, useNotifications } from '@novu/react';

function App() {
  return (
    <NovuProvider
      applicationIdentifier={process.env.NEXT_PUBLIC_NOVU_APP_ID}
      subscriberId={user.id}
    >
      <NotificationCenter />
    </NovuProvider>
  );
}

function NotificationCenter() {
  const { notifications, markAsRead, markAllAsRead } = useNotifications();

  return (
    <div>
      {notifications.map((notification) => (
        <div key={notification.id}>
          <h3>{notification.title}</h3>
          <p>{notification.body}</p>
          <button onClick={() => markAsRead(notification.id)}>
            Mark as Read
          </button>
        </div>
      ))}
    </div>
  );
}
```

#### 4.4.2. Vue Integration

```typescript
// Install
npm install @novu/vue

// Usage
import { NovuProvider, useNovu } from '@novu/vue';

// Similar pattern to React
```

### 4.5. In-App Features

- **Real-time updates**: WebSocket connection cho real-time notifications
- **Mark as read/unread**: Quản lý trạng thái đọc
- **Grouping**: Nhóm notifications theo type hoặc time
- **Actions**: Buttons và links trong notifications
- **Customization**: Tùy chỉnh UI/UX

---

## Push Notification Channel

### 5.1. Tổng Quan

Push notifications gửi thông báo đến thiết bị người dùng (mobile hoặc web browser).

### 5.2. Mobile Push (iOS/Android)

#### 5.2.1. Setup FCM (Firebase Cloud Messaging)

1. Tạo Firebase project
2. Lấy Server Key và Sender ID
3. Cấu hình trong Novu Dashboard

#### 5.2.2. Setup APNS (Apple Push Notification Service)

1. Tạo Apple Developer account
2. Tạo APNS key hoặc certificate
3. Upload vào Novu Dashboard

### 5.3. Web Push

#### 5.3.1. Setup VAPID Keys

```bash
# Generate VAPID keys
npm install web-push
npx web-push generate-vapid-keys
```

#### 5.3.2. Frontend Setup

```typescript
// Request permission
const registration = await navigator.serviceWorker.ready;
const subscription = await registration.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: VAPID_PUBLIC_KEY,
});

// Send subscription to backend
await fetch('/api/push/subscribe', {
  method: 'POST',
  body: JSON.stringify(subscription),
});
```

### 5.4. Workflow Configuration

```typescript
{
  workflowId: 'order-shipped-push',
  steps: [
    {
      type: 'push',
      name: 'shipping-notification',
      template: {
        title: 'Order Shipped',
        body: 'Your order {{orderNumber}} has been shipped!',
        data: {
          orderId: '{{orderId}}',
          trackingNumber: '{{trackingNumber}}',
        },
        actionButtons: [
          {
            type: 'primary',
            text: 'Track Order',
            action: {
              type: 'redirect',
              url: '{{trackingUrl}}',
            },
          },
        ],
      },
    },
  ],
}
```

### 5.5. Sử Dụng trong Module

```typescript
await notificationService.sendNotification({
  to: {
    subscriberId: 'user-123',
  },
  workflowId: 'order-shipped-push',
  payload: {
    orderNumber: 'ORD-12345',
    orderId: 'order-123',
    trackingNumber: 'TRACK-789',
    trackingUrl: 'https://example.com/track/TRACK-789',
  },
  overrides: {
    push: {
      title: '🚚 Order Shipped!',
      sound: 'default',
      badge: 1,
    },
  },
});
```

### 5.6. Push Notification Best Practices

1. **Permission**: Luôn request permission trước khi gửi
2. **Timing**: Tránh gửi vào giờ nghỉ
3. **Personalization**: Cá nhân hóa nội dung
4. **Actions**: Thêm action buttons khi có thể
5. **Deep linking**: Link đến đúng màn hình trong app
6. **Frequency**: Không spam, giới hạn số lượng

---

## Chat Channel

### 6.1. Tổng Quan

Chat channel tích hợp với các platform như Slack, Discord, Microsoft Teams.

### 6.2. Slack Integration

#### 6.2.1. Setup

1. Tạo Slack App tại https://api.slack.com/apps
2. Lấy Webhook URL
3. Cấu hình trong Novu Dashboard

#### 6.2.2. Workflow Configuration

```typescript
{
  workflowId: 'slack-alert',
  steps: [
    {
      type: 'chat',
      name: 'send-slack-message',
      template: {
        body: 'Alert: {{message}}',
        channel: '#alerts',
        username: 'System Bot',
        iconEmoji: ':warning:',
      },
    },
  ],
}
```

### 6.3. Discord Integration

Tương tự Slack, sử dụng Discord Webhook URL.

### 6.4. Microsoft Teams Integration

Sử dụng Teams Incoming Webhook connector.

### 6.5. Sử Dụng trong Module

```typescript
await notificationService.sendNotification({
  to: {
    subscriberId: 'team-123',
  },
  workflowId: 'slack-alert',
  payload: {
    message: 'New order received: ORD-12345',
    orderId: 'order-123',
    amount: '$99.99',
  },
});
```

---

## Best Practices

### 7.1. Channel Selection

**Khi nào dùng Email:**
- Thông báo không urgent
- Cần lưu trữ lâu dài
- Nội dung dài, phức tạp
- Cần attachments

**Khi nào dùng SMS:**
- Thông báo urgent (OTP, alerts)
- Người dùng không có internet
- Cần delivery guarantee cao

**Khi nào dùng In-App:**
- Thông báo trong ứng dụng
- Cần real-time updates
- Tương tác với user trong app

**Khi nào dùng Push:**
- Thông báo trên thiết bị
- User không đang dùng app
- Cần immediate attention

**Khi nào dùng Chat:**
- Thông báo team/internal
- Tích hợp với workflow tools
- Collaboration notifications

### 7.2. Multi-Channel Strategy

```typescript
// Example: Important notification via multiple channels
await notificationService.sendNotification({
  to: {
    subscriberId: 'user-123',
    email: 'user@example.com',
    phone: '+84123456789',
  },
  workflowId: 'important-update',
  payload: {
    title: 'Account Security Alert',
    message: 'Your password has been changed',
  },
});

// Workflow sẽ gửi:
// 1. In-App (immediate)
// 2. Email (backup, record)
// 3. SMS (nếu urgent và enabled)
```

### 7.3. User Preferences

Luôn tôn trọng user preferences:

```typescript
// Check preferences before sending
const preferences = await notificationService.getSubscriberPreferences(userId);

if (preferences.email.enabled) {
  // Send email
}

if (preferences.sms.enabled && isUrgent) {
  // Send SMS
}
```

### 7.4. Error Handling

```typescript
try {
  const result = await notificationService.sendNotification(dto);
  
  if (result.status === 'error') {
    // Log error
    // Retry logic
    // Fallback channel
  }
} catch (error) {
  // Handle error
  // Log for monitoring
  // Notify admin if critical
}
```

### 7.5. Performance Optimization

1. **Bulk Operations**: Sử dụng bulk API cho nhiều notifications
2. **Async Processing**: Xử lý notification async, không block request
3. **Caching**: Cache subscriber preferences
4. **Rate Limiting**: Implement rate limiting để tránh spam

---

## Tổng Kết

Mỗi kênh thông báo có điểm mạnh và use case riêng. Module được thiết kế để hỗ trợ tất cả các kênh một cách thống nhất, cho phép:

- **Linh hoạt**: Chọn kênh phù hợp với từng use case
- **Multi-channel**: Gửi qua nhiều kênh cùng lúc
- **User preferences**: Tôn trọng lựa chọn của user
- **Scalability**: Scale từng kênh độc lập

---

**Ngày tạo**: 2025-01-16  
**Phiên bản**: 1.0.0

