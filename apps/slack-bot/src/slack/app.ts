import { App } from '@slack/bolt';
import { registerHandlers } from './handlers.js';

export function createSlackApp() {
  const botToken = process.env.SLACK_BOT_TOKEN;
  const appToken = process.env.SLACK_APP_TOKEN;
  if (!botToken || !appToken) {
    throw new Error('Missing SLACK_BOT_TOKEN or SLACK_APP_TOKEN in env');
  }

  const app = new App({
    token: botToken,
    appToken,
    socketMode: true,
  });

  registerHandlers(app);
  return app;
}
