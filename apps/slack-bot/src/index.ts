import 'dotenv/config';
import { createSlackApp } from './slack/app.js';
import { createApiServer } from './web/server.js';
import { ensureDb } from './storage/db.js';

async function main() {
  ensureDb();

  const port = Number(process.env.PORT || 8787);
  const api = createApiServer();
  api.listen(port, () => {
    console.log(`[api] listening on http://localhost:${port}`);
  });

  const slackApp = createSlackApp();
  await slackApp.start();
  console.log('[slack] Socket Mode app started');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
