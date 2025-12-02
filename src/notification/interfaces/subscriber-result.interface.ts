export interface SubscriberResult {
  subscriberId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  locale?: string;
  timezone?: string;
  data?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}


