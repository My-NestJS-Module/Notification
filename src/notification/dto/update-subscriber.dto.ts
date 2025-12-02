export interface UpdateSubscriberDto {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  locale?: string;
  timezone?: string;
  data?: Record<string, any>;
}


