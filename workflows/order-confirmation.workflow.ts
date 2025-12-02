import { workflow } from '@novu/framework';
import { z } from 'zod';

/**
 * Pattern 1: Simple Single Channel (Email xác nhận đơn hàng)
 * Tham chiếu: docs/WORKFLOW_PATTERNS.md, mục 2.1.
 */
export const orderConfirmationWorkflow = workflow(
  'order-confirmation',
  async ({ payload, step }) => {
    await step.email('send-confirmation', async () => ({
      subject: `Order Confirmation - ${payload.orderNumber}`,
      body: `
        <h1>Thank you for your order!</h1>
        <p>Order Number: ${payload.orderNumber}</p>
        <p>Total: ${payload.totalAmount}</p>
      `,
    }));
  },
  {
    payloadSchema: z.object({
      orderNumber: z.string(),
      totalAmount: z.string(),
    }),
  },
);

