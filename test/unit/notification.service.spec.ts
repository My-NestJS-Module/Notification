import { Test } from '@nestjs/testing';

import { NotificationService } from '../../src/notification/notification.service';
import { NotificationProvider } from '../../src/notification/providers/notification.provider.interface';
import { SendNotificationDto } from '../../src/notification/dto';

describe('NotificationService', () => {
  let service: NotificationService;
  let provider: NotificationProvider;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: 'NOTIFICATION_PROVIDER',
          useValue: {
            trigger: jest.fn(),
            createSubscriber: jest.fn(),
            updateSubscriber: jest.fn(),
            getSubscriberPreferences: jest.fn(),
            updateSubscriberPreferences: jest.fn(),
          } as NotificationProvider,
        },
      ],
    }).compile();

    service = moduleRef.get(NotificationService);
    provider = moduleRef.get('NOTIFICATION_PROVIDER');
  });

  it('should validate and forward sendNotification dto to provider', async () => {
    const dto: SendNotificationDto = {
      to: { subscriberId: 'user-1' },
      workflowId: 'test-workflow',
      payload: { foo: 'bar' },
    };

    (provider.trigger as jest.Mock).mockResolvedValue({
      acknowledged: true,
      status: 'processed',
    });

    const result = await service.sendNotification(dto);

    expect(provider.trigger).toHaveBeenCalledWith(dto);
    expect(result.acknowledged).toBe(true);
  });

  it('should throw if workflowId is missing', async () => {
    const dto: any = {
      to: { subscriberId: 'user-1' },
      payload: {},
    };

    await expect(service.sendNotification(dto)).rejects.toThrow(
      'workflowId is required',
    );
  });
});


