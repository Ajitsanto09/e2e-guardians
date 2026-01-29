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
  raw: string;

  slack: {
    channelId: string;
    messageTs: string; // the original failure message ts
    postedBy?: string;
  };

  jiraLinks: string[];
};

export type ActivityType = 'comment' | 'reaction' | 'jira_linked';

export type Activity = {
  id: string;
  createdAt: string;
  incidentId: string;
  userId: string;

  type: ActivityType;
  text?: string;

  slack: {
    channelId: string;
    messageTs: string;
    threadTs?: string;
  };

  meta: Record<string, any>;
};

export type ScorePeriod = 'week' | 'month';

export type Score = {
  userId: string;
  periodKey: string; // e.g. 2026-W05 or 2026-01
  points: number;
  breakdown: Record<string, number>;
  updatedAt: string;
};

export type DbShape = {
  incidents: Incident[];
  activities: Activity[];
  scores: Score[];
};
