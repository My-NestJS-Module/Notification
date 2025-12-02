import { workflow } from '@novu/framework';
import { z } from 'zod';

/**
 * Pattern: Rate Limiting
 * Tham chiếu: docs/code-first-workflows/WORKFLOW-PATTERNS-CODE-FIRST.md
 * workflowId: notification-rate-limiting
 *
 * Lưu ý:
 * - Đây là ví dụ pattern, logic kiểm tra limit thực tế nên được triển khai
 *   bằng store ngoài (Redis, DB, ...) tại project host.
 */
export const rateLimitingWorkflow = workflow(
  'notification-rate-limiting',
  async ({ payload, step }) => {
    // TODO: Tại project host, nên thay block này bằng gọi tới service check limit thật.
    const isLimited = false;

    const limitCheck = await step.run('rate-limit-check', async () => ({
      limited: isLimited,
    }));

    if (limitCheck.limited) {
      // Bị limit: có thể log hoặc gửi event khác, không gửi notification chính.
      return;
    }

    await step.inApp('rate-limited-inapp', async () => ({
      title: payload.title,
      body: payload.message,
    }));
  },
  {
    payloadSchema: z.object({
      tenantId: z.string(),
      userId: z.string(),
      key: z.string(),
      title: z.string(),
      message: z.string(),
    }),
  },
);


