require('dotenv').config();
const express = require('express');
const cors = require('cors');

const clientsRouter = require('./routes/clients');
const competitorsRouter = require('./routes/competitors');
const pricesRouter = require('./routes/prices');
const alertsRouter = require('./routes/alerts');
const systemRouter = require('./routes/system');

// Boot scheduler (registers cron jobs)
require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://rateradar.io',
    /^file:\/\//,
  ],
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
  const ts = new Date().toISOString().replace('T', ' ').split('.')[0];
  console.log(`[${ts}] ${req.method} ${req.path}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/clients', clientsRouter);
app.use('/api/competitors', competitorsRouter);
app.use('/api/prices', pricesRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api', systemRouter);

// Root
app.get('/', (_req, res) => {
  res.json({ name: 'RateRadar API', version: '1.0.0', status: 'running' });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  const ts = new Date().toISOString().replace('T', ' ').split('.')[0];
  console.log(`[${ts}] RateRadar API running on port ${PORT}`);
});

module.exports = app;
