import { workflow } from '@novu/framework';
import { z } from 'zod';

/**
 * Pattern 6: Fallback Chain (Push → Email → SMS)
 * Tham chiếu: docs/WORKFLOW_PATTERNS.md, mục 2.6.
 */
export const criticalAlertWorkflow = workflow(
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
  {
    payloadSchema: z.object({
      title: z.string(),
      message: z.string(),
    }),
  },
);


