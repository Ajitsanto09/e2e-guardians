import type { App } from '@slack/bolt';
import { parseFailureMessage } from '../utils/parseFailureMessage.js';
import { db } from '../storage/db.js';
import { awardActivity } from '../scoring/award.js';
import { isInScopeChannel } from '../utils/scope.js';

const INVESTIGATING_EMOJI = 'eyes'; // 👀
const RESOLVED_EMOJI = 'white_check_mark'; // ✅
const FIXING_EMOJI = 'hammer_and_wrench'; // 🛠
const TICKET_EMOJI = 'receipt'; // 🧾

export function registerHandlers(app: App) {
  // Any message in private channels (message.groups) will come through as "message" event.
  app.event('message', async ({ event, client, logger }) => {
    try {
      // @ts-expect-error slack event typing is broad
      const ev = event as any;

      if (!isInScopeChannel(ev.channel)) return;
      if (ev.subtype) return; // ignore message_changed, bot_message, etc.
      if (!ev.text) return;

      // Optional: only accept messages posted by a specific notifier bot/user id
      const notifierId = process.env.E2E_NOTIFIER_USER_ID;
      if (notifierId && ev.user && ev.user !== notifierId) {
        // still allow thread replies (which come from humans) later
      }

      const isThreadReply = Boolean(ev.thread_ts);
      const isTopLevel = !isThreadReply;

      // 1) If this is a top-level failure message, create an incident.
      if (isTopLevel) {
        const incident = parseFailureMessage(ev.text);
        if (!incident) return;

        const created = db.upsertIncidentFromSlack({
          channelId: ev.channel,
          messageTs: ev.ts,
          postedBy: ev.user,
          ...incident,
        });

        if (created.created) {
          logger.info(`[incident] created ${created.incident.id}`);
          // Optionally prompt for reactions
          if (process.env.ENABLE_BOT_POSTS === 'true') {
            await client.chat.postMessage({
              channel: ev.channel,
              thread_ts: ev.ts,
              text:
                '👀 React with :eyes: to claim investigation. Post a Jira link in this thread when you create/link a ticket. React with ✅ when resolved.',
            });
          }
        }
        return;
      }

      // 2) Thread reply: attribute to incident via thread_ts
      const parentTs = ev.thread_ts;
      const incident = db.findIncidentBySlack(ev.channel, parentTs);
      if (!incident) return;

      const activity = db.addActivity({
        incidentId: incident.id,
        slack: {
          channelId: ev.channel,
          messageTs: ev.ts,
          threadTs: parentTs,
        },
        userId: ev.user,
        type: 'comment',
        text: ev.text,
        meta: {},
      });

      awardActivity(activity, incident);

      // Jira link detection
      const jiraUrl = db.detectAndAttachJiraLink(incident.id, ev.text);
      if (jiraUrl) {
        const jiraActivity = db.addActivity({
          incidentId: incident.id,
          slack: {
            channelId: ev.channel,
            messageTs: ev.ts,
            threadTs: parentTs,
          },
          userId: ev.user,
          type: 'jira_linked',
          text: ev.text,
          meta: { jiraUrl },
        });
        awardActivity(jiraActivity, incident);
      }
    } catch (err) {
      logger.error(err);
    }
  });

  // Reactions
  app.event('reaction_added', async ({ event, logger }) => {
    try {
      // @ts-expect-error slack event typing is broad
      const ev = event as any;
      const channelId = ev.item?.channel;
      const messageTs = ev.item?.ts;
      if (!channelId || !messageTs) return;
      if (!isInScopeChannel(channelId)) return;

      const incident = db.findIncidentBySlack(channelId, messageTs);
      // Reactions can also be added to thread replies; map to parent if possible
      const incident2 =
        incident || db.findIncidentByAnyMessage(channelId, messageTs);
      if (!incident2) return;

      const emoji = ev.reaction;
      let mapped: 'investigating' | 'resolved' | 'fixing' | 'ticket' | 'other' =
        'other';
      if (emoji === INVESTIGATING_EMOJI) mapped = 'investigating';
      else if (emoji === RESOLVED_EMOJI) mapped = 'resolved';
      else if (emoji === FIXING_EMOJI) mapped = 'fixing';
      else if (emoji === TICKET_EMOJI) mapped = 'ticket';

      const activity = db.addActivity({
        incidentId: incident2.id,
        slack: { channelId, messageTs },
        userId: ev.user,
        type: 'reaction',
        text: `:${emoji}:`,
        meta: { emoji, mapped },
      });

      // Update incident status from key emojis
      if (mapped === 'investigating') db.setIncidentStatus(incident2.id, 'investigating');
      if (mapped === 'resolved') db.setIncidentStatus(incident2.id, 'resolved');

      awardActivity(activity, incident2);
    } catch (err) {
      logger.error(err);
    }
  });
}
