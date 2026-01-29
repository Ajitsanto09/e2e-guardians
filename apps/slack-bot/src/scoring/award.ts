import { db } from '../storage/db.js';
import type { Activity, Incident } from '../storage/types.js';
import { getAwards } from './rules.js';

function alreadyCredited(incidentId: string, userId: string, key: string): boolean {
  const st = db.getState();
  // for some actions, allow multiple (comments), but prevent multiple for key actions
  if (key === 'comment') return false;

  // check activities for same key in meta OR same type semantics
  return st.activities.some((a) => {
    if (a.incidentId !== incidentId) return false;
    if (a.userId !== userId) return false;
    if (a.type === 'jira_linked' && key === 'jira_linked') return true;
    if (a.type === 'reaction' && a.meta?.mapped && a.meta.mapped === key) return true;
    if (a.type === 'reaction' && key === 'investigating' && a.meta?.mapped === 'investigating') return true;
    if (a.type === 'reaction' && key === 'resolved' && a.meta?.mapped === 'resolved') return true;
    if (a.type === 'reaction' && key === 'fixing' && a.meta?.mapped === 'fixing') return true;
    return false;
  });
}

export function awardActivity(activity: Activity, incident: Incident) {
  const awards = getAwards(activity, incident);
  for (const a of awards) {
    // prevent duplicates for key actions
    if (alreadyCredited(activity.incidentId, activity.userId, a.key)) continue;
    db.upsertScore(activity.userId, a.points, a.key);
  }
}
