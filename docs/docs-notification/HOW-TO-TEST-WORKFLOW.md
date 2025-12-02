## Hướng Dẫn Test Workflows Code-First

> Mục tiêu: viết các test đơn giản (chủ yếu unit test) cho workflows code-first  
> trong project host (NestJS/NextJS/Node), không phụ thuộc trực tiếp vào Novu Cloud.

### 1. Chiến lược test

- **Unit test logic**:
  - Test trên hàm workflow hoặc các helper function xung quanh.
  - Kiểm tra các nhánh logic (A/B Testing, VIP vs Regular, Rate Limiting, ...).
- **Không cần**:
  - Kết nối thật tới Novu Cloud cho mọi test.
  - Gửi email/SMS thực trong unit test.

> Lý tưởng là kết hợp:
> - Unit test cho logic branching, payload validation.
> - Integration/e2e test riêng (tuỳ theo nhu cầu từng project).

---

### 2. Mẫu Unit Test đơn giản (Pseudo)

Ví dụ minh hoạ ý tưởng test cho workflow Conditional Branching (VIP vs Regular).  
Giả sử trong project host, bạn có helper để **simulate** workflow (team có thể tự implement).

```ts
import { conditionalBranchingWorkflow } from './conditional-branching.workflow';

describe('conditionalBranchingWorkflow', () => {
  it('gửi đủ 3 kênh cho VIP', async () => {
    const payload = {
      tenantId: 'tenant-a',
      userId: 'user-1',
      segment: 'VIP',
      subject: 'Hello',
      message: 'VIP message',
    };

    // Giả sử có hàm simulateWorkflow do team tự hiện thực
    const result = await simulateWorkflow(conditionalBranchingWorkflow, payload);

    expect(result.channelsSent).toEqual(expect.arrayContaining(['in-app', 'email', 'sms']));
  });
});
```

> `simulateWorkflow` không được cung cấp sẵn bởi repo này – tuỳ mỗi team có thể:  
> - Mock các step (`step.inApp`, `step.email`, `step.sms`, ...) bằng spy.  
> - Hoặc tạo abstraction riêng bọc quanh workflow để kiểm tra output.

---

### 3. Test payload schema (zod)

Vì mỗi workflow dùng `zod` cho `payloadSchema`, có thể test riêng phần validate:

```ts
import { z } from 'zod';
import { conditionalBranchingWorkflowPayloadSchema } from './schemas'; // ví dụ nếu tách riêng

describe('conditionalBranching payload schema', () => {
  it('reject payload thiếu segment', () => {
    const payload = {
      tenantId: 'tenant-a',
      userId: 'user-1',
      subject: 'hi',
      message: 'msg',
    };

    expect(() =>
      conditionalBranchingWorkflowPayloadSchema.parse(payload),
    ).toThrow();
  });
});
```

> Trong các file ví dụ hiện tại, schema được inline trong `workflow()`.  
> Team có thể trích schema ra file riêng nếu muốn test tách biệt.

---

### 4. Phân biệt lỗi test vs lỗi logic code

- Nếu test fail vì **expectation sai**:
  - Ví dụ: test kỳ vọng gửi SMS cho `REGULAR` nhưng design quyết định chỉ gửi In-App.
  - Khi đó cần **sửa test** cho đúng với design đã thống nhất.
- Nếu test fail vì **logic trong workflow sai**:
  - Ví dụ: branch `VIP` không gửi SMS như requirement.
  - Khi đó cần **sửa code** của workflow (và giữ nguyên test).

Khi viết test mới, nên:

- Liên kết với docs design/pattern tương ứng:
  - Ví dụ: `docs/code-first-workflows/WORKFLOW-PATTERNS-CODE-FIRST.md` – mục Conditional Branching.
- Ghi chú rõ trong test **expected behaviour** để người đọc dễ review.

---

### 5. Gợi ý cho Integration / E2E

- Tài liệu này tập trung vào unit test; integration/e2e là tuỳ chọn:
  - Có thể viết e2e test chạy trên môi trường staging với Novu Cloud thật.
  - Hoặc mock bridge `@novu/framework` bằng Express/Next.js test client.
- Khi viết e2e:
  - Rõ ràng hoá phạm vi:
    - Test từ API backend → NotificationModule → Novu → workflows?
    - Hay chỉ test bridge `@novu/framework` với workflows?


