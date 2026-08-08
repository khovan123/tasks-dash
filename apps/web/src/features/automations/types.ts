export interface AutomationRule {
  _id: string;
  name: string;
  isSystem?: boolean;
  enabled: boolean;
  trigger: string;
  executionMode: string;
  cronExpression?: string;
  actions?: Array<{
    type: string;
    config?: {
      channelType?: string;
      title?: string;
      message?: string;
    };
  }>;
  runCount: number;
  lastRunAt?: string;
  lastResult?: string;
  lastError?: string;
}

export interface AutomationChannelOption {
  id: string;
  name: string;
  displayLabel: string;
}
