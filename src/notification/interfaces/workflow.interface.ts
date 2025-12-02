export type WorkflowChannelType = 'email' | 'sms' | 'in_app' | 'push' | 'chat';

export interface WorkflowStepControlValues {
  subject?: string;
  body: string;
  title?: string;
  preheader?: string;
  icon?: string;
}

export interface WorkflowStepDefinitionDto {
  name: string;
  type: WorkflowChannelType;
  controlValues: WorkflowStepControlValues;
}

export interface CreateWorkflowDto {
  workflowId: string;
  name: string;
  description?: string;
  tags?: string[];
  steps: WorkflowStepDefinitionDto[];
}

export type UpdateWorkflowDto = Partial<Omit<CreateWorkflowDto, 'workflowId'>>;

export interface WorkflowResult {
  id: string;
  workflowId: string;
  name: string;
  description?: string;
  tags?: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}


