import { Inject, Injectable } from '@nestjs/common';

import { NotificationProvider } from './providers/notification.provider.interface';
import {
  SendNotificationDto,
  CreateSubscriberDto,
  UpdateSubscriberDto,
} from './dto';
import {
  NotificationResult,
  SubscriberResult,
  SubscriberPreferences,
  CreateWorkflowDto,
  UpdateWorkflowDto,
  WorkflowResult,
} from './interfaces';

@Injectable()
export class NotificationService {
  constructor(
    @Inject('NOTIFICATION_PROVIDER')
    private readonly provider: NotificationProvider,
  ) {}

  /**
   * Gửi notification thông qua workflow Novu.
   * Module chỉ validate tối thiểu, không chứa business logic.
   */
  async sendNotification(dto: SendNotificationDto): Promise<NotificationResult> {
    this.validateSendNotificationDto(dto);
    return this.provider.trigger(dto);
  }

  async sendBulkNotifications(
    events: SendNotificationDto[],
  ): Promise<NotificationResult[] | void> {
    if (!events.length) {
      return [];
    }

    for (const event of events) {
      this.validateSendNotificationDto(event);
    }

    if (this.provider.triggerBulk) {
      return this.provider.triggerBulk(events);
    }

    const results: NotificationResult[] = [];
    for (const event of events) {
      // eslint-disable-next-line no-await-in-loop
      const res = await this.provider.trigger(event);
      results.push(res);
    }
    return results;
  }

  async createSubscriber(
    dto: CreateSubscriberDto,
  ): Promise<SubscriberResult> {
    this.validateCreateSubscriberDto(dto);
    return this.provider.createSubscriber(dto);
  }

  async updateSubscriber(
    subscriberId: string,
    dto: UpdateSubscriberDto,
  ): Promise<SubscriberResult> {
    if (!subscriberId) {
      throw new Error('subscriberId is required');
    }
    return this.provider.updateSubscriber(subscriberId, dto);
  }

  async getSubscriberPreferences(
    subscriberId: string,
  ): Promise<SubscriberPreferences> {
    if (!subscriberId) {
      throw new Error('subscriberId is required');
    }
    return this.provider.getSubscriberPreferences(subscriberId);
  }

  async updateSubscriberPreferences(
    subscriberId: string,
    preferences: SubscriberPreferences,
  ): Promise<SubscriberPreferences> {
    if (!subscriberId) {
      throw new Error('subscriberId is required');
    }
    return this.provider.updateSubscriberPreferences(subscriberId, preferences);
  }

  async createWorkflow(dto: CreateWorkflowDto): Promise<WorkflowResult> {
    if (!this.provider.createWorkflow) {
      throw new Error(
        'Current NotificationProvider does not implement createWorkflow()',
      );
    }

    if (!dto.workflowId) {
      throw new Error('workflowId is required');
    }
    if (!dto.name) {
      throw new Error('name is required');
    }
    if (!dto.steps || dto.steps.length === 0) {
      throw new Error('steps is required');
    }

    return this.provider.createWorkflow(dto);
  }

  async updateWorkflow(
    workflowId: string,
    dto: UpdateWorkflowDto,
  ): Promise<WorkflowResult> {
    if (!this.provider.updateWorkflow) {
      throw new Error(
        'Current NotificationProvider does not implement updateWorkflow()',
      );
    }

    if (!workflowId) {
      throw new Error('workflowId is required');
    }

    return this.provider.updateWorkflow(workflowId, dto);
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    if (!this.provider.deleteWorkflow) {
      throw new Error(
        'Current NotificationProvider does not implement deleteWorkflow()',
      );
    }

    if (!workflowId) {
      throw new Error('workflowId is required');
    }

    return this.provider.deleteWorkflow(workflowId);
  }

  private validateSendNotificationDto(dto: SendNotificationDto): void {
    if (!dto.workflowId) {
      throw new Error('workflowId is required');
    }
    if (!dto.to?.subscriberId) {
      throw new Error('subscriberId is required');
    }
    if (!dto.payload) {
      throw new Error('payload is required');
    }
  }

  private validateCreateSubscriberDto(dto: CreateSubscriberDto): void {
    if (!dto.subscriberId) {
      throw new Error('subscriberId is required');
    }
  }
}


