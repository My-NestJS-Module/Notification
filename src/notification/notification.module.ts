import { Global, Module, DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { NotificationService } from './notification.service';
import { NovuProvider } from './providers/novu.provider';
import {
  NotificationConfig,
  NotificationModuleOptions,
} from './config/notification.config';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    NotificationConfig,
    NotificationService,
    {
      provide: 'NOTIFICATION_PROVIDER',
      useClass: NovuProvider,
    },
  ],
  exports: [NotificationService],
})
export class NotificationModule {
  static forRoot(options?: NotificationModuleOptions): DynamicModule {
    return {
      module: NotificationModule,
      imports: [ConfigModule],
      providers: [
        NotificationConfig,
        NotificationService,
        {
          provide: 'NOTIFICATION_CONFIG',
          useValue: options,
        },
        {
          provide: 'NOTIFICATION_PROVIDER',
          useClass: NovuProvider,
        },
      ],
      exports: [NotificationService],
    };
  }
}


