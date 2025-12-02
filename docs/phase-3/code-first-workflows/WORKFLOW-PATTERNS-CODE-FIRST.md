## Workflow Patterns Code-First

> Các pattern dưới đây được implement dưới dạng ví dụ trong thư mục `workflows/`.  
> Mỗi pattern mô tả: payload schema (zod), channels, và `workflowId` tương ứng.

### 1. Digest (Daily / Weekly Digest)

- **File**:
  - Daily: `workflows/comment-digest.workflow.ts`
  - Weekly: `workflows/comment-digest-weekly.workflow.ts`
- **Mục tiêu**:
  - Gửi thông báo in-app ngay khi có sự kiện (ví dụ: new comment).
  - Gom các sự kiện lại và gửi email tổng hợp theo lịch (daily/weekly).
- **Payload schema (zod)**:
  - Các trường cơ bản:
    - `commenterName: string`
    - `comment: string`
    - `postId: string`
    - Có thể mở rộng thêm: `tenantId`, `timezone`, `from`, `to`, ...
- **Channels**:
  - In-App (thông báo ngay lập tức).
  - Email (digest hàng ngày/tuần).
- **WorkflowId**:
  - Daily: `comment-digest`
  - Weekly: `comment-digest-weekly`

### 2. Fallback Chain (Push → Email → SMS)

- **File**: `workflows/critical-alert.workflow.ts`
- **Mục tiêu**:
  - Đảm bảo thông báo quan trọng được gửi tới người dùng qua nhiều kênh, với fallback rõ ràng.
  - Ưu tiên Push, nếu thất bại sẽ fallback Email, sau đó là SMS.
- **Payload schema (zod)**:
  - `title: string`
  - `message: string`
  - Có thể mở rộng thêm: `tenantId`, `severity`, ...
- **Channels**:
  - Push (primary).
  - Email (fallback).
  - SMS (fallback cuối).
- **WorkflowId**:
  - `critical-alert`

### 3. A/B Testing

- **File**: `workflows/ab-testing.workflow.ts`
- **Mục tiêu**:
  - Thử nghiệm nhiều variant cho cùng một loại thông báo (subject/body khác nhau, channel khác nhau, v.v.).
  - Cho phép đo lường hiệu quả từng variant ở phía analytics.
- **Payload schema (zod)**:
  - Gợi ý một số trường:
    - `tenantId: string`
    - `userId: string`
    - `experimentId: string`
    - `variant: 'A' | 'B' | 'C'` (có thể giới hạn lại tuỳ use case).
- **Channels**:
  - Thường là Email / In-App / Push, tuỳ variant.
- **WorkflowId**:
  - `notification-ab-testing`

### 4. Rate Limiting

- **File**: `workflows/rate-limiting.workflow.ts`
- **Mục tiêu**:
  - Hạn chế số lần gửi thông báo cho một user/tenant trong khoảng thời gian nhất định.
  - Tránh spam người dùng hoặc vượt limit của provider.
- **Payload schema (zod)**:
  - Gợi ý một số trường:
    - `tenantId: string`
    - `userId: string`
    - `key: string` – định danh cho loại thông báo (ví dụ: `login-alert`, `promo`).
    - Có thể thêm `windowInMinutes`, `maxCount` nếu muốn config linh hoạt.
- **Channels**:
  - Không cố định; pattern tập trung vào **step kiểm tra hạn mức** trước khi gửi qua kênh bất kỳ.
- **WorkflowId**:
  - `notification-rate-limiting`

### 5. Conditional Branching (VIP vs Regular / Premium vs Free)

- **File**: `workflows/conditional-branching.workflow.ts`
- **Mục tiêu**:
  - Gửi nội dung/kênh khác nhau dựa trên phân khúc người dùng.
  - Ví dụ: VIP nhận thêm SMS/Push, Regular chỉ nhận Email.
- **Payload schema (zod)**:
  - Gợi ý một số trường:
    - `tenantId: string`
    - `userId: string`
    - `segment: 'VIP' | 'REGULAR' | 'PREMIUM' | 'FREE'`
- **Channels**:
  - Phụ thuộc `segment`, ví dụ:
    - `VIP`: Email + SMS + In-App.
    - `REGULAR`: Email + In-App.
    - `FREE`: chỉ In-App.
- **WorkflowId**:
  - `segment-conditional`

### 6. Gắn kết với NotificationModule

- Mọi `workflowId` ở trên được dùng như **string identifier** từ phía `NotificationModule`:
  - `NotificationService.sendNotification({ workflowId: 'critical-alert', ... })`.
- Module core không cần biết chi tiết logic bên trong workflow, chỉ cần:
  - `workflowId` là stable và được versioning rõ ràng (xem thêm `GOVERNANCE-AND-OBSERVABILITY.md`).


