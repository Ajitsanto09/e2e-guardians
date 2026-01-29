import fs from 'node:fs';
import path from 'node:path';
import { nanoid } from 'nanoid';
import type { Activity, DbShape, Incident, IncidentStatus, Score } from './types.js';
import { getPeriodKeys } from '../utils/time.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

let state: DbShape | null = null;

export function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ incidents: [], activities: [], scores: [] }, null, 2));
  }
  state = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as DbShape;
}

function save() {
  if (!state) throw new Error('DB not initialized');
  state.incidents.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2));
}

function nowIso() {
  return new Date().toISOString();
}

export const db = {
  getState(): DbShape {
    if (!state) throw new Error('DB not initialized');
    return state;
  },

  upsertIncidentFromSlack(input: {
    channelId: string;
    messageTs: string;
    postedBy?: string;
    env?: string;
    app?: string;
    failingTests: string[];
    pipelineName?: string;
    stageName?: string;
    pipelineLink?: string;
    raw: string;
  }): { created: boolean; incident: Incident } {
    if (!state) throw new Error('DB not initialized');

    const existing = state.incidents.find(
      (i) => i.slack.channelId === input.channelId && i.slack.messageTs === input.messageTs,
    );
    if (existing) return { created: false, incident: existing };

    const incident: Incident = {
      id: nanoid(),
      createdAt: nowIso(),
      updatedAt: nowIso(),
      status: 'failed',
      env: input.env,
      app: input.app,
      pipelineName: input.pipelineName,
      stageName: input.stageName,
      pipelineLink: input.pipelineLink,
      failingTests: input.failingTests || [],
      raw: input.raw,
      slack: {
        channelId: input.channelId,
        messageTs: input.messageTs,
        postedBy: input.postedBy,
      },
      jiraLinks: [],
    };

    state.incidents.push(incident);
    save();
    return { created: true, incident };
  },

  findIncidentBySlack(channelId: string, messageTs: string): Incident | undefined {
    if (!state) throw new Error('DB not initialized');
    return state.incidents.find((i) => i.slack.channelId === channelId && i.slack.messageTs === messageTs);
  },

  // sometimes reactions happen on a thread reply; we map by searching activities
  findIncidentByAnyMessage(channelId: string, messageTs: string): Incident | undefined {
    if (!state) throw new Error('DB not initialized');
    const act = state.activities.find((a) => a.slack.channelId === channelId && a.slack.messageTs === messageTs);
    if (!act) return undefined;
    return state.incidents.find((i) => i.id === act.incidentId);
  },

  addActivity(input: Omit<Activity, 'id' | 'createdAt'>): Activity {
    if (!state) throw new Error('DB not initialized');
    const activity: Activity = {
      ...input,
      id: nanoid(),
      createdAt: nowIso(),
    };
    state.activities.push(activity);
    // bump incident updatedAt
    const incident = state.incidents.find((i) => i.id === input.incidentId);
    if (incident) incident.updatedAt = nowIso();
    save();
    return activity;
  },

  setIncidentStatus(incidentId: string, status: IncidentStatus) {
    if (!state) throw new Error('DB not initialized');
    const incident = state.incidents.find((i) => i.id === incidentId);
    if (!incident) return;
    incident.status = status;
    incident.updatedAt = nowIso();
    save();
  },

  detectAndAttachJiraLink(incidentId: string, text: string): string | null {
    if (!state) throw new Error('DB not initialized');
    const jiraHost = process.env.JIRA_HOST;
    const urlRe = /(https?:\/\/[^\s>]+)|(www\.[^\s>]+)/gi;
    const matches = text.match(urlRe) || [];
    const jiraLinks = matches.filter((u) => {
      if (!jiraHost) return /jira/i.test(u);
      return u.startsWith(jiraHost);
    });
    if (jiraLinks.length === 0) return null;

    const incident = state.incidents.find((i) => i.id === incidentId);
    if (!incident) return null;

    const url = jiraLinks[0];
    if (!incident.jiraLinks.includes(url)) {
      incident.jiraLinks.push(url);
      incident.updatedAt = nowIso();
      save();
    }
    return url;
  },

  upsertScore(userId: string, deltaPoints: number, breakdownKey: string) {
    if (!state) throw new Error('DB not initialized');

    const { weekKey, monthKey } = getPeriodKeys(new Date());
    const keys = [weekKey, monthKey];

    for (const periodKey of keys) {
      let score = state.scores.find((s) => s.userId === userId && s.periodKey === periodKey);
      if (!score) {
        score = {
          userId,
          periodKey,
          points: 0,
          breakdown: {},
          updatedAt: nowIso(),
        };
        state.scores.push(score);
      }
      score.points += deltaPoints;
      score.breakdown[breakdownKey] = (score.breakdown[breakdownKey] || 0) + deltaPoints;
      score.updatedAt = nowIso();
    }
    save();
  },

  // helpers for API
  listIncidents() {
    if (!state) throw new Error('DB not initialized');
    return state.incidents;
  },

  listActivitiesByIncident(incidentId: string) {
    if (!state) throw new Error('DB not initialized');
    return state.activities
      .filter((a) => a.incidentId === incidentId)
      .sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1));
  },

  leaderboard(periodKey: string) {
    if (!state) throw new Error('DB not initialized');
    return state.scores
      .filter((s) => s.periodKey === periodKey)
      .sort((a, b) => b.points - a.points);
  },
};
