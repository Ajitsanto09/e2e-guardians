import express from 'express';
import cors from 'cors';
import { db } from '../storage/db.js';
import { getPeriodKeys } from '../utils/time.js';

export function createApiServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/incidents', (req, res) => {
    const status = (req.query.status as string | undefined) || undefined;
    const incidents = db.listIncidents().filter((i) => (status ? i.status === status : true));
    res.json(incidents);
  });

  app.get('/api/incidents/:id', (req, res) => {
    const id = req.params.id;
    const incident = db.listIncidents().find((i) => i.id === id);
    if (!incident) return res.status(404).json({ error: 'not_found' });
    const activities = db.listActivitiesByIncident(id);
    res.json({ incident, activities });
  });

  app.get('/api/leaderboard', (req, res) => {
    const now = new Date();
    const { weekKey, monthKey } = getPeriodKeys(now);
    const period = (req.query.period as string | undefined) || 'week';
    const periodKey = period === 'month' ? monthKey : weekKey;
    const rows = db.leaderboard(periodKey);
    res.json({ periodKey, rows });
  });

  return app;
}
