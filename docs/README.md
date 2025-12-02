# Tài Liệu Module NestJS Notification với Novu

## Mục Lục Tài Liệu

Tài liệu này cung cấp hướng dẫn chi tiết về module NestJS Notification sử dụng Novu cho việc gửi và nhận thông báo đa kênh.

### 1. [ARCHITECTURE.md](./ARCHITECTURE.md)
Tài liệu kiến trúc tổng quan bao gồm:
- Tổng quan về module và Novu
- Kiến trúc module và cấu trúc thư mục
- Các phụ thuộc và dependencies
- Luồng hoạt động chi tiết
- Luồng dữ liệu và data structures
- Use cases thực tế
- Chi tiết implementation
- Hướng dẫn tái sử dụng và mở rộng

**Đọc đầu tiên**: Bắt đầu với tài liệu này để hiểu tổng quan về kiến trúc và cách module hoạt động.

### 2. [CHANNELS.md](./CHANNELS.md)
Tài liệu chi tiết về các kênh thông báo:
- Email Channel: Setup, configuration, providers
- SMS Channel: Configuration, best practices
- In-App Channel: Frontend integration
- Push Notification Channel: Mobile và Web Push
- Chat Channel: Slack, Discord, Teams integration
- Best practices cho từng kênh

**Khi nào đọc**: Khi cần tìm hiểu chi tiết về một kênh cụ thể hoặc setup provider.

### 3. [WORKFLOW_PATTERNS.md](./WORKFLOW_PATTERNS.md)
Tài liệu về workflow patterns và best practices:
- Tổng quan về workflows
- 7 workflow patterns phổ biến
- Code-first vs Dashboard approach
- Advanced patterns
- Best practices và testing

**Khi nào đọc**: Khi cần thiết kế workflows hoặc tìm pattern phù hợp cho use case.

---

## Quick Start

### Bước 1: Cài đặt Dependencies

```bash
npm install @nestjs/common @nestjs/core @nestjs/config @novu/api
```

### Bước 2: Cấu hình Environment Variables

```env
NOVU_API_KEY=your_novu_api_key
NOVU_SERVER_URL=https://api.novu.co  # Optional
```

### Bước 3: Import Module

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NotificationModule.forRoot(),
  ],
})
export class AppModule {}
```

### Bước 4: Sử dụng trong Service

```typescript
// order.service.ts
import { Injectable } from '@nestjs/common';
import { NotificationService } from './notification/notification.service';

@Injectable()
export class OrderService {
  constructor(
    private readonly notificationService: NotificationService,
  ) {}

  async createOrder(orderData: CreateOrderDto) {
    const order = await this.orderRepository.save(orderData);

    // Send notification
    await this.notificationService.sendNotification({
      to: {
        subscriberId: order.userId,
        email: order.userEmail,
      },
      workflowId: 'order-confirmation',
      payload: {
        orderId: order.id,
        total: order.total,
      },
    });

    return order;
  }
}
```

---

## Tài Liệu Tham Khảo

### Novu Official Documentation
- **Novu Docs**: https://docs.novu.co
- **Novu API SDK**: https://github.com/novuhq/novu/tree/next/packages/novu
- **Novu Framework**: https://github.com/novuhq/novu/tree/next/packages/framework
- **Novu Quickstart (NestJS)**: https://docs.novu.co/framework/quickstart/nestjs

### NestJS Documentation
- **NestJS Docs**: https://docs.nestjs.com
- **NestJS Modules**: https://docs.nestjs.com/modules
- **NestJS Providers**: https://docs.nestjs.com/providers

### Context7 Documentation
- **Novu Library**: /novuhq/novu
- **Novu Docs Library**: /novuhq/docs

---

## Research Sources

Tài liệu này được tạo dựa trên:

1. **Novu Official Documentation** từ Context7
   - Source: https://github.com/novuhq/novu
   - Source: https://github.com/novuhq/docs

2. **Code Examples** từ các dự án mã nguồn mở
   - GitHub repositories sử dụng Novu với NestJS
   - npm packages: @novu/api, @novu/framework

3. **Web Research**
   - Best practices từ cộng đồng
   - Integration guides
   - Architecture patterns

---

## Cấu Trúc Tài Liệu

```
docs/
├── README.md              # Tài liệu này (tổng quan)
├── ARCHITECTURE.md        # Kiến trúc chi tiết
├── CHANNELS.md            # Chi tiết các kênh thông báo
└── WORKFLOW_PATTERNS.md   # Workflow patterns và best practices
```

---

## Hỗ Trợ

Nếu có câu hỏi hoặc cần hỗ trợ:

1. Đọc tài liệu chi tiết trong các file tương ứng
2. Tham khảo Novu Official Documentation
3. Kiểm tra code examples trong các dự án mã nguồn mở

---

**Ngày tạo**: 2025-01-16  
**Phiên bản**: 1.0.0  
**Cập nhật lần cuối**: 2025-01-16

