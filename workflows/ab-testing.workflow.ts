import { workflow } from '@novu/framework';
import { z } from 'zod';

/**
 * Pattern: A/B Testing
 * Tham chiếu: docs/code-first-workflows/WORKFLOW-PATTERNS-CODE-FIRST.md
 * workflowId: notification-ab-testing
 *
 * Mục tiêu:
 * - Gửi nội dung/kênh khác nhau dựa trên variant (A/B).
 * - Cho phép đo lường hiệu quả từng variant bằng analytics ngoài.
 */
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


