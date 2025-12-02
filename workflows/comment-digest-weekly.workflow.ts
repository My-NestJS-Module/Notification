import { workflow, CronExpression } from '@novu/framework';
import { z } from 'zod';

/**
 * Pattern: Digest Weekly (In-App + Weekly Email Digest)
 * Tham chiếu: docs/code-first-workflows/WORKFLOW-PATTERNS-CODE-FIRST.md
 * workflowId: comment-digest-weekly
 *
 * Gợi ý sử dụng:
 * - Gửi in-app ngay khi có comment.
 * - Gom comment lại và gửi email tổng hợp mỗi tuần.
 */
export const commentDigestWeeklyWorkflow = workflow(
  'comment-digest-weekly',
  async ({ payload, step }) => {
    // Immediate in-app notification
    await step.inApp('new-comment-weekly', async () => ({
      title: 'New Comment',
      body: `${payload.commenterName} commented on your post`,
    }));

    // Collect comments for weekly digest
    const digest = await step.digest('weekly-digest', async () => ({
      cron: CronExpression.EVERY_SUNDAY_AT_8AM,
    }));

    await step.email(
      'weekly-comment-digest',
      async () => ({
        subject: `Weekly Comment Summary - ${digest.events.length} new comments`,
        body: `
          <h1>Weekly Comment Summary</h1>
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


