export type IncidentStatus = 'failed' | 'investigating' | 'mitigated' | 'resolved';

export type Incident = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: IncidentStatus;
  env?: string;
  app?: string;
  pipelineName?: string;
  stageName?: string;
  pipelineLink?: string;
  failingTests: string[];
  jiraLinks: string[];
  slack: { channelId: string; messageTs: string };
};

export type Activity = {
  id: string;
  createdAt: string;
  incidentId: string;
  userId: string;
  type: 'comment' | 'reaction' | 'jira_linked';
  text?: string;
  meta: Record<string, any>;
};
