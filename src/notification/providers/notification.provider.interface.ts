import {
  SendNotificationDto,
  CreateSubscriberDto,
  UpdateSubscriberDto,
} from '../dto';
import {
  NotificationResult,
  SubscriberResult,
  SubscriberPreferences,
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowResult,
} from '../interfaces';

/**
 * Abstraction cho provider notification (Novu là implementation mặc định).
 * Module có thể thay thế bằng provider khác nếu cần.
 */
export interface NotificationProvider {
  trigger(dto: SendNotificationDto): Promise<NotificationResult>;

  triggerBulk?(
    events: SendNotificationDto[],
  ): Promise<NotificationResult[] | void>;

  createSubscriber(dto: CreateSubscriberDto): Promise<SubscriberResult>;

  updateSubscriber(
    subscriberId: string,
    dto: UpdateSubscriberDto,
  ): Promise<SubscriberResult>;

  getSubscriberPreferences(
    subscriberId: string,
  ): Promise<SubscriberPreferences>;

  updateSubscriberPreferences(
    subscriberId: string,
    preferences: SubscriberPreferences,
  ): Promise<SubscriberPreferences>;

  // Quản lý workflow (code-first) – optional, dùng cho admin/CI
  createWorkflow?(dto: CreateWorkflowDto): Promise<WorkflowResult>;

  updateWorkflow?(
    workflowId: string,
    dto: UpdateWorkflowDto,
  ): Promise<WorkflowResult>;

  deleteWorkflow?(workflowId: string): Promise<void>;
}


