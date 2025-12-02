import { workflow } from '@novu/framework';
import { z } from 'zod';

/**
 * Pattern: Conditional Branching (VIP vs Regular / Premium vs Free)
 * Tham chiếu: docs/code-first-workflows/WORKFLOW-PATTERNS-CODE-FIRST.md
 * workflowId: segment-conditional
 */
export const conditionalBranchingWorkflow = workflow(
  'segment-conditional',
  async ({ payload, step }) => {
    if (payload.segment === 'VIP') {
      await step.inApp('vip-inapp', async () => ({
        title: 'VIP Notification',
        body: payload.message,
      }));

      await step.email('vip-email', async () => ({
        subject: '[VIP] ' + payload.subject,
        body: payload.message,
      }));

      await step.sms('vip-sms', async () => ({
        body: `[VIP] ${payload.message}`,
      }));
    } else if (payload.segment === 'PREMIUM') {
      await step.inApp('premium-inapp', async () => ({
        title: 'Premium Notification',
        body: payload.message,
      }));

      await step.email('premium-email', async () => ({
        subject: '[Premium] ' + payload.subject,
        body: payload.message,
      }));
    } else {
      await step.inApp('regular-inapp', async () => ({
        title: 'Notification',
        body: payload.message,
      }));
    }
  },
  {
    payloadSchema: z.object({
      tenantId: z.string(),
      userId: z.string(),
      segment: z.enum(['VIP', 'PREMIUM', 'FREE', 'REGULAR']),
      subject: z.string(),
      message: z.string(),
    }),
  },
);


