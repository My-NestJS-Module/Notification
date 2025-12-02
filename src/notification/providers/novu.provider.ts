import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Novu } from '@novu/api';

import { NotificationProvider } from './notification.provider.interface';
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
import {
  NotificationConfig,
  NotificationModuleOptions,
} from '../config/notification.config';

@Injectable()
export class NovuProvider implements NotificationProvider {
  private readonly novu: Novu;

  constructor(
    private readonly notificationConfig: NotificationConfig,
    private readonly configService: ConfigService,
    @Optional()
    @Inject('NOTIFICATION_CONFIG')
    private readonly options?: NotificationModuleOptions,
  ) {
    const apiKey =
      this.options?.novu.apiKey ?? this.notificationConfig.apiKey;

    const serverUrl =
      this.options?.novu.serverUrl ?? this.notificationConfig.serverUrl;

    this.novu = new Novu({
      secretKey: apiKey,
      // serverUrl theo đúng tên option trong @novu/api
      ...(serverUrl && { serverUrl }),
    });
  }

  async trigger(dto: SendNotificationDto): Promise<NotificationResult> {
    try {
      const result = await this.novu.trigger({
        workflowId: dto.workflowId,
        to: dto.to,
        payload: dto.payload,
        overrides: dto.overrides,
        transactionId: dto.transactionId,
      });

      const data: any = (result as any).data ?? result;

      const rawStatus = data?.status;
      const status: NotificationResult['status'] =
        rawStatus === 'processed' ? 'processed' : 'error';

      return {
        acknowledged: Boolean(data?.acknowledged ?? true),
        status,
        transactionId: data?.transactionId,
      };
    } catch (error: any) {
      return {
        acknowledged: false,
        status: 'error',
        error: {
          message: error?.message ?? 'Unknown error from Novu trigger()',
          code: error?.code,
        },
      };
    }
  }

  async triggerBulk(
    events: SendNotificationDto[],
  ): Promise<NotificationResult[] | void> {
    if (!events.length) {
      return [];
    }

    // Novu chưa có bulk trigger chính thức trong SDK cũ;
    // tuỳ version, có thể cần gọi REST API thủ công. Ở mức cơ bản,
    // ta loop từng event để giữ implementation đơn giản và an toàn.
    const results: NotificationResult[] = [];
    for (const event of events) {
      // eslint-disable-next-line no-await-in-loop
      const res = await this.trigger(event);
      results.push(res);
    }
    return results;
  }

  async createSubscriber(dto: CreateSubscriberDto): Promise<SubscriberResult> {
    const result = await this.novu.subscribers.create(dto as any);
    return this.mapSubscriberResult((result as any).data ?? result);
  }

  async updateSubscriber(
    subscriberId: string,
    dto: UpdateSubscriberDto,
  ): Promise<SubscriberResult> {
    // Cast sang any để làm việc với SDK trong khi typings có thể chưa đầy đủ
    const client: any = this.novu as any;
    const result = await client.subscribers.update(subscriberId, dto as any);
    return this.mapSubscriberResult((result as any).data ?? result);
  }

  async getSubscriberPreferences(
    subscriberId: string,
  ): Promise<SubscriberPreferences> {
    const client: any = this.novu as any;
    const result = await client.subscribers.preferences.get(subscriberId);
    return ((result as any).data ?? result) as SubscriberPreferences;
  }

  async updateSubscriberPreferences(
    subscriberId: string,
    preferences: SubscriberPreferences,
  ): Promise<SubscriberPreferences> {
    const client: any = this.novu as any;
    const result = await client.subscribers.preferences.update(
      subscriberId,
      preferences as any,
    );
    return ((result as any).data ?? result) as SubscriberPreferences;
  }

  async createWorkflow(dto: CreateWorkflowDto): Promise<WorkflowResult> {
    const client: any = this.novu as any;
    if (!client.workflows?.create) {
      throw new Error(
        '[NotificationModule] Novu client does not support workflows.create(). Make sure you are using a version that exposes workflows v2 API.',
      );
    }

    const result = await client.workflows.create({
      workflowId: dto.workflowId,
      name: dto.name,
      description: dto.description,
      tags: dto.tags,
      steps: dto.steps.map((step) => ({
        name: step.name,
        type: step.type,
        controlValues: step.controlValues,
      })),
    });

    const data = (result as any).data ?? result;

    return {
      id: data._id ?? data.id,
      workflowId: data.workflowId,
      name: data.name,
      description: data.description,
      tags: data.tags,
      active: Boolean(data.active),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async updateWorkflow(
    workflowId: string,
    dto: UpdateWorkflowDto,
  ): Promise<WorkflowResult> {
    const client: any = this.novu as any;
    if (!client.workflows?.update) {
      throw new Error(
        '[NotificationModule] Novu client does not support workflows.update(). Make sure you are using a version that exposes workflows v2 API.',
      );
    }

    const result = await client.workflows.update(workflowId, {
      name: dto.name,
      description: dto.description,
      tags: dto.tags,
      steps: dto.steps?.map((step) => ({
        name: step.name,
        type: step.type,
        controlValues: step.controlValues,
      })),
    });

    const data = (result as any).data ?? result;

    return {
      id: data._id ?? data.id,
      workflowId: data.workflowId,
      name: data.name,
      description: data.description,
      tags: data.tags,
      active: Boolean(data.active),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async deleteWorkflow(workflowId: string): Promise<void> {
    const client: any = this.novu as any;
    if (!client.workflows?.delete) {
      throw new Error(
        '[NotificationModule] Novu client does not support workflows.delete(). Make sure you are using a version that exposes workflows v2 API.',
      );
    }

    await client.workflows.delete(workflowId);
  }

  private mapSubscriberResult(data: any): SubscriberResult {
    return {
      subscriberId: data.subscriberId,
      email: data.email,
      phone: data.phone,
      firstName: data.firstName,
      lastName: data.lastName,
      avatar: data.avatar,
      locale: data.locale,
      timezone: data.timezone,
      data: data.data,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }
}


