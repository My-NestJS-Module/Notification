## A. Task Summary

- Hoàn tất Phase 3: bổ sung thư mục `docs/code-first-workflows/`, cập nhật `workflows/` với 7 workflows mẫu, mở rộng tài liệu `docs/docs-notification/` và chuẩn hoá `workflows/README.md`.
- Xây dựng hướng dẫn kiến trúc + how-to cho layer code-first tách biệt khỏi module core, đảm bảo hỗ trợ multi-tenant/multi-env và governance/versioning.

## B. Code Implementation Details

- **Tài liệu kiến trúc layer code-first**  

```1:52:docs/code-first-workflows/DESIGN-CODE-FIRST-LAYER.md
## Thiết Kế Layer Code-First Workflows
... (nội dung mô tả tách lớp core vs code-first, luồng dữ liệu, tổ chức thư mục) ...
```

  - Giải thích cách NotificationModule chỉ dùng `@novu/api` và workflows chỉ dùng `@novu/framework`, đồng thời mô tả luồng Application → Core → Novu → Service workflows.

- **Workflow A/B Testing mẫu**  

```1:39:workflows/ab-testing.workflow.ts
export const abTestingWorkflow = workflow(
  'notification-ab-testing',
  async ({ payload, step }) => {
    if (payload.variant === 'A') {
      await step.email('ab-test-email-A', async () => ({
        subject: `[A] ${payload.subject}`,
        body: payload.bodyA,
      }));
    } else {
      await step.email('ab-test-email-B', async () => ({
        subject: `[B] ${payload.subject}`,
        body: payload.bodyB,
      }));
    }
  },
  {
    payloadSchema: z.object({
      tenantId: z.string(),
      userId: z.string(),
      experimentId: z.string(),
      variant: z.enum(['A', 'B']),
      subject: z.string(),
      bodyA: z.string(),
      bodyB: z.string(),
    }),
  },
);
```

  - Minh hoạ pattern A/B Testing, payload schema bằng `zod`, workflowId rõ ràng để đồng bộ với NotificationModule.

- **Tổng quan mẫu workflows**  

```1:34:workflows/README.md
| File | Pattern | `workflowId` | Channels chính |
| --- | --- | --- | --- |
| `order-confirmation.workflow.ts` | Simple Single Channel ... |
... (bảng liệt kê 7 workflows) ...
```

  - Bảng tổng hợp liệt kê 7 workflows, pattern và channels tương ứng để team dễ tra cứu khi copy sang project host.

## C. Testing

- **Loại test**: Chưa chạy automated test thực tế; Phase này tập trung xây dựng thư viện mẫu + docs.
- **Hướng dẫn test**: Cung cấp guideline unit test trong `docs/docs-notification/HOW-TO-TEST-WORKFLOW.md` để teams áp dụng khi copy workflows vào project host.
- **Ghi chú**: Cần viết/tuỳ chỉnh test tại project host vì workflows được wiring và chạy ở môi trường đó.

## D. Challenges and Solutions

- **Đảm bảo tách biệt core và code-first**: Thử thách là tránh để `src/notification` phụ thuộc `@novu/framework`; giải pháp là giữ toàn bộ workflows dưới thư mục riêng và chỉ cung cấp sample/docs.
- **Đồng bộ multi-tenant/multi-env**: Cần làm rõ mapping tenant → Novu project/env; xử lý bằng docs kiến trúc (DESIGN + GOVERNANCE) để hướng dẫn cách cấu hình ở NotificationModule.
- **Consistency giữa docs và code**: Việc mở rộng 7 workflows đòi hỏi cập nhật tài liệu đi kèm; đã đồng bộ `workflows/README.md` và các file docs mới.

## E. Improvements and Optimizations

- Chuẩn hoá naming + versioning cho `workflowId`, khuyến nghị format `<domain>.<pattern>.vX`.
- Bổ sung pattern nâng cao (rate limiting, conditional branching, A/B Testing, weekly digest) giúp team reuse nhanh hơn.
- Cung cấp guideline observability (log, metrics, tracing) để nâng cao khả năng giám sát workflows trong môi trường production.

## F. Tools and Technologies Used

- **Development**: TypeScript, `@novu/framework`, `zod`, NestJS module structures (tài liệu).
- **Documentation**: Markdown trong `docs/` và `docs/docs-notification/`.
- **Testing**: Chưa chạy test tự động; cung cấp hướng dẫn unit test sử dụng Jest/Vitest (tuỳ project host).
- **Code Analysis**: manual review, không dùng thêm analyzer tự động.


