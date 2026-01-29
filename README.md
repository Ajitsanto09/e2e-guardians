# E2E Guardians (local Slack + leaderboard)

A local-only monorepo that:
- Listens to a **private Slack channel** (Socket Mode) for E2E failure messages + thread replies + emoji reactions
- Tracks who investigated / linked Jira / resolved
- Exposes a local API
- Renders a React + Redux dashboard with incidents + leaderboard

## Prereqs
- Node.js 18+ (20+ recommended)
- npm 9+ (or any modern npm)

## 1) Create a Slack App (Socket Mode)
1. Create a Slack App in your workspace.
2. Enable **Socket Mode**.
3. Create an **App-Level Token** with scope: `connections:write` (starts with `xapp-...`)
4. Under OAuth & Permissions add Bot Token Scopes:
   - `groups:history`
   - `reactions:read`
   - `users:read`
   - `chat:write` (optional, only if you want the bot to post messages)
5. Install the app to your workspace.
6. Invite the bot to your **private** E2E channel: `/invite @YourBotName`

## 2) Configure env vars
Copy `.env.example` to `.env` inside `apps/slack-bot`:

```bash
cp apps/slack-bot/.env.example apps/slack-bot/.env
```

Fill:
- `SLACK_BOT_TOKEN` (xoxb-...)
- `SLACK_APP_TOKEN` (xapp-...)
- `E2E_CHANNEL_ID` (private channel ID, like C0123...)
- `JIRA_HOST` (optional, e.g. https://jira.yourcompany.com)

## 3) Install deps
From repo root:
```bash
npm install
```

## 4) Run locally
In two terminals:

### Terminal A: bot + API
```bash
npm run dev:bot
```

### Terminal B: web
```bash
npm run dev:web
```

- API: http://localhost:8787
- Web: http://localhost:5173

## How scoring works (default)
- 👀 investigating: +2 (once per incident per user)
- any thread reply: +1
- Jira link in thread: +5 (once per incident per user)
- ✅ resolved: +5 (once per incident per user)
- 🛠 fix in progress: +3 (once per incident per user)

You can tweak scoring in: `apps/slack-bot/src/scoring/rules.ts`

## Storage
This MVP stores everything in a local JSON file:
`apps/slack-bot/data/db.json`

Safe for local use, easy to inspect. You can swap this for SQLite later.

## Notes
- To be detected as an incident, a Slack message must include a pipeline/build link or match the phrase "E2E tests are failing".
- Incidents are keyed by `(channelId + messageTs)`.
