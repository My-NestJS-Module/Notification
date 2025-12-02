import { workflow, CronExpression } from '@novu/framework';
import { z } from 'zod';

/**
 * Pattern 5: Digest Pattern (In-App + Daily Email Digest)
 * Tham chiếu: docs/WORKFLOW_PATTERNS.md, mục 2.5.
 */
export const commentDigestWorkflow = workflow(
  'comment-digest',
  async ({ payload, step }) => {
    // Immediate in-app notification
    await step.inApp('new-comment', async () => ({
      title: 'New Comment',
      body: `${payload.commenterName} commented on your post`,
    }));

    // Collect comments for digest
    const digest = await step.digest('daily-digest', async () => ({
      cron: CronExpression.EVERY_DAY_AT_9AM,
    }));

    // Send digest email if there are comments
    await step.email(
      'daily-comment-digest',
      async (controls) => ({
        subject: `${controls.subjectPrefix} - ${digest.events.length} new comments`,
        body: `
          <h1>Daily Comment Summary</h1>
          <p>You have ${digest.events.length} new comments:</p>
          <ul>
            ${digest.events
            .map(
              (event) =>
                `<li>${event.payload.commenterName}: ${event.payload.comment}</li>`,
            )
            .join('')}
          </ul>
        `,
      }),
      {
        skip: () => digest.events.length === 0,
        controlSchema: z.object({
          subjectPrefix: z.string().default('Daily Summary'),
        }),
      },
    );
  },
  {
    payloadSchema: z.object({
      commenterName: z.string(),
      comment: z.string(),
      postId: z.string(),
    }),
  },
);
