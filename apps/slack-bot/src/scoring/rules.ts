import type { Activity, Incident } from '../storage/types.js';

export type Award = { points: number; key: string };

export function getAwards(activity: Activity, incident: Incident): Award[] {
  // prevent double-awarding same action per incident per user
  // This is enforced in award.ts by checking existing activities.

  if (activity.type === 'comment') {
    return [{ points: 1, key: 'comment' }];
  }

  if (activity.type === 'jira_linked') {
    return [{ points: 5, key: 'jira_linked' }];
  }

  if (activity.type === 'reaction') {
    const mapped = activity.meta?.mapped;
    if (mapped === 'investigating') return [{ points: 2, key: 'investigating' }];
    if (mapped === 'resolved') return [{ points: 5, key: 'resolved' }];
    if (mapped === 'fixing') return [{ points: 3, key: 'fixing' }];
    if (mapped === 'ticket') return [{ points: 2, key: 'ticket_reaction' }];
  }

  return [];
}
