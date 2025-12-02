# Tóm Tắt Nghiên Cứu: Novu cho Module NestJS Notification

## Tổng Quan Nghiên Cứu

Nghiên cứu này được thực hiện để thiết kế và xây dựng một module NestJS có thể tái sử dụng cho việc gửi và nhận thông báo đa kênh sử dụng Novu.

**Ngày nghiên cứu**: 2025-01-16  
**Mục tiêu**: Tạo module tái sử dụng, độc lập với business logic, hỗ trợ đa kênh (SMS, Email, Web Push, Mobile Push, In-app)

---

## Nguồn Thông Tin

### 1. Context7 Documentation

#### 1.1. Novu Library (/novuhq/novu)
- **Source**: https://github.com/novuhq/novu
- **Code Snippets**: 119 examples
- **Benchmark Score**: 82.7

**Thông tin chính**:
- Novu là open-source notification platform
- Hỗ trợ multi-channel: In-App, Push, Email, SMS, Chat
- Cung cấp SDK cho TypeScript/Node.js: `@novu/api`
- Framework SDK: `@novu/framework` cho code-first workflows

#### 1.2. Novu Docs Library (/novuhq/docs)
- **Source**: https://github.com/novuhq/docs
- **Code Snippets**: 714 examples
- **Benchmark Score**: 68

**Thông tin chính**:
- Workflow engine với steps chainable
- Subscriber management và preferences
- Provider abstraction cho mỗi kênh
- Multi-channel notification delivery

### 2. Code Research (GitHub, npm)

#### 2.1. GitHub Repositories
Tìm thấy các dự án sử dụng Novu với NestJS:
- `novuhq/novu`: Official Novu repository với NestJS examples
- `samsvin/case-clinical`: Module `api-novu-notification-feature`
- `AletheiaFact/aletheia`: `notifications.module.ts`
- `akash-network/console`: Notifications module implementation

#### 2.2. npm Packages
- `@novu/api` (v3.11.0): JavaScript SDK chính thức
- `@novu/framework` (v2.8.0): Code-first workflow SDK
- `@novu/nest`: Wrapper cho NestJS (tìm thấy trong research nhưng không có package riêng)

### 3. Web Research

#### 3.1. Novu Integration với NestJS
- Novu cung cấp `@novu/framework/nest` cho NestJS integration
- Sử dụng `NovuModule.register()` để đăng ký module
- Hỗ trợ dependency injection cho workflows

#### 3.2. Architecture Patterns
- Provider pattern để abstract notification provider
- Facade pattern cho NotificationService
- Module pattern của NestJS để tái sử dụng

---

## Phát Hiện Chính

### 1. Novu API SDK

#### 1.1. Initialization
```typescript
import { Novu } from "@novu/api";

const novu = new Novu({
  secretKey: process.env.NOVU_API_KEY,
  serverURL: "https://api.novu.co", // Optional, default
});
```

#### 1.2. Trigger Notification
```typescript
await novu.trigger({
  workflowId: "workflow_identifier",
  to: {
    subscriberId: "subscriber_unique_identifier",
    email: "user@example.com",
    firstName: "John",
    lastName: "Doe",
  },
  payload: {
    // Data for template variables
  },
  overrides: {
    // Channel-specific overrides
  },
});
```

#### 1.3. Subscriber Management
```typescript
// Create subscriber
await novu.subscribers.create({
  subscriberId: "user-123",
  email: "user@example.com",
  firstName: "John",
  lastName: "Doe",
});

// Update subscriber
await novu.subscribers.update(subscriberId, {
  email: "newemail@example.com",
});

// Get/Update preferences
await novu.subscribers.preferences.get(subscriberId);
await novu.subscribers.preferences.update(subscriberId, preferences);
```

### 2. Novu Framework SDK

#### 2.1. Code-First Workflows
```typescript
import { workflow } from '@novu/framework';
import { z } from 'zod';

const commentWorkflow = workflow(
  'comment-on-post',
  async ({ payload, step, subscriber }) => {
    await step.inApp('notify-new-comment', async () => ({
      body: `${payload.authorName} commented on your post`,
    }));

    await step.email('send-email', async () => ({
      subject: 'New Comment',
      body: 'You have a new comment',
    }));
  },
  {
    payloadSchema: z.object({
      authorName: z.string(),
      postTitle: z.string(),
    }),
  },
);
```

#### 2.2. NestJS Integration
```typescript
import { NovuModule } from '@novu/framework/nest';

@Module({
  imports: [
    NovuModule.register({
      apiPath: '/api/novu',
      workflows: [commentWorkflow],
    }),
  ],
})
export class AppModule {}
```

### 3. Workflow Patterns

#### 3.1. Multi-Channel
- Gửi qua nhiều kênh cùng lúc (In-App + Email + Push)
- Tự động route dựa trên subscriber preferences

#### 3.2. Sequential với Delay
- Gửi thông báo tuần tự với delay giữa các bước
- Use case: Reminder notifications, follow-up emails

#### 3.3. Digest Pattern
- Tổng hợp nhiều thông báo và gửi theo lịch
- Use case: Daily/weekly digests

#### 3.4. Conditional Branching
- Gửi thông báo khác nhau dựa trên điều kiện
- Use case: VIP vs Regular users

### 4. Channels và Providers

#### 4.1. Email
- Providers: SendGrid, AWS SES, Mailgun, Postmark, Mandrill
- Template engine: Handlebars
- Support HTML và text emails

#### 4.2. SMS
- Providers: Twilio, AWS SNS, Plivo, MessageBird
- Format: E.164 phone number format
- Best practice: Ngắn gọn, rõ ràng

#### 4.3. In-App
- Built-in Novu Inbox component
- Real-time updates qua WebSocket
- Frontend SDKs: @novu/react, @novu/vue

#### 4.4. Push
- Mobile: FCM (Android), APNS (iOS)
- Web: Web Push API với VAPID keys
- Support actions và deep linking

#### 4.5. Chat
- Platforms: Slack, Discord, Microsoft Teams, Mattermost
- Webhook-based integration

---

## Kiến Trúc Đề Xuất

### 1. Module Structure

```
notification-module/
├── src/
│   ├── notification.module.ts
│   ├── notification.service.ts
│   ├── providers/
│   │   ├── novu.provider.ts
│   │   └── notification.provider.interface.ts
│   ├── interfaces/
│   ├── dto/
│   └── config/
```

### 2. Design Patterns

1. **Facade Pattern**: NotificationService đóng vai trò facade
2. **Provider Pattern**: Interface cho phép thay thế implementation
3. **Dependency Injection**: Sử dụng NestJS DI container
4. **Module Pattern**: Global module để tái sử dụng

### 3. Key Components

#### 3.1. NotificationService (Facade)
- API đơn giản cho application layer
- Validation và transformation
- Error handling

#### 3.2. NotificationProvider (Interface)
- Abstract interface
- Cho phép thay thế implementation
- NovuProvider là implementation mặc định

#### 3.3. DTOs
- SendNotificationDto
- CreateSubscriberDto
- UpdateSubscriberDto

---

## Use Cases Được Xác Định

1. **Email Xác Nhận Đơn Hàng**: Gửi email khi đơn hàng được tạo
2. **SMS OTP**: Gửi mã OTP qua SMS
3. **In-App + Email Digest**: In-app ngay, email digest hàng ngày
4. **Multi-Channel với Preferences**: Gửi qua nhiều kênh dựa trên user preferences
5. **Bulk Notifications**: Gửi cho nhiều users cùng lúc

---

## Dependencies Cần Thiết

### Core Dependencies
```json
{
  "@nestjs/common": "^11.0.0",
  "@nestjs/core": "^11.0.0",
  "@nestjs/config": "^3.0.0",
  "@novu/api": "^3.11.0",
  "@novu/framework": "^2.8.0",
  "rxjs": "^7.8.0",
  "zod": "^3.22.0"
}
```

### Environment Variables
```env
NOVU_API_KEY=your_api_key
NOVU_SERVER_URL=https://api.novu.co  # Optional
NOVU_APP_ID=your_app_id  # Optional, for Inbox
```

---

## Best Practices Được Xác Định

### 1. Module Design
- Tách biệt hoàn toàn khỏi business logic
- Sử dụng interfaces để dễ test và mở rộng
- Global module để tái sử dụng

### 2. Error Handling
- Try-catch cho tất cả API calls
- Retry logic cho failed requests
- Fallback channels khi cần

### 3. Performance
- Bulk operations cho nhiều notifications
- Async processing để không block requests
- Caching subscriber preferences

### 4. Testing
- Unit tests với mock providers
- Integration tests với real Novu API (optional)
- Test workflows với test data

---

## Tài Liệu Đã Tạo

1. **ARCHITECTURE.md**: Kiến trúc chi tiết, luồng hoạt động, implementation
2. **CHANNELS.md**: Chi tiết từng kênh, setup, best practices
3. **WORKFLOW_PATTERNS.md**: 7 patterns phổ biến, advanced patterns
4. **README.md**: Tổng quan và quick start

---

## Kết Luận

Nghiên cứu đã xác định:

1. **Novu phù hợp** cho việc xây dựng module notification đa kênh
2. **Kiến trúc module** với provider pattern cho phép tái sử dụng cao
3. **Workflow patterns** đa dạng cho nhiều use cases
4. **Best practices** từ cộng đồng và documentation

Module được thiết kế để:
- **Tái sử dụng**: Có thể dùng trong nhiều dự án
- **Linh hoạt**: Hỗ trợ nhiều kênh và patterns
- **Dễ sử dụng**: API đơn giản, rõ ràng
- **Maintainable**: Code structure tốt, dễ test

---

## Nguồn Tham Khảo

### Official Documentation
- Novu Docs: https://docs.novu.co
- Novu GitHub: https://github.com/novuhq/novu
- Novu Framework: https://github.com/novuhq/novu/tree/next/packages/framework

### Context7
- /novuhq/novu
- /novuhq/docs

### Code Examples
- GitHub repositories với Novu + NestJS
- npm packages: @novu/api, @novu/framework

---

**Ngày hoàn thành**: 2025-01-16  
**Phiên bản**: 1.0.0

