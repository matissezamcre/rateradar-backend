# RateRadar

Automatic hotel price monitoring. Scrapes competitor prices on Booking.com every night and sends alerts when prices change.

---

## Project structure

```
.
├── public/                  # Static frontend — deployed to Vercel
│   ├── index.html           # Marketing website (rateradar.io)
│   ├── dashboard.html       # Client dashboard (rateradar.io/dashboard)
│   └── crm.html             # Internal CRM (rateradar.io/crm)
│
├── routes/                  # Express API routes
│   ├── clients.js           # /api/clients
│   ├── competitors.js       # /api/competitors
│   ├── prices.js            # /api/prices
│   ├── alerts.js            # /api/alerts
│   └── system.js            # /api/health, /api/scrape/*
│
├── index.js                 # Express server entry point
├── airtable.js              # Airtable ORM (Clients, Competitors, PriceHistory, Alerts)
├── scraper.js               # Playwright scraper for Booking.com
├── mailer.js                # Resend email templates
├── scheduler.js             # Cron jobs (daily scrape 06h00, weekly report Mon 08h00)
├── vercel.json              # Vercel static deployment config
├── railway.toml             # Railway backend deployment config
└── .env.example             # Environment variable template
```

---

## Deploying the frontend to Vercel

### First deploy

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Vercel auto-detects `vercel.json` — no build settings needed.
4. Click **Deploy**.

### URLs after deploy

| Path | File |
|------|------|
| `rateradar.io/` | `public/index.html` |
| `rateradar.io/dashboard` | `public/dashboard.html` |
| `rateradar.io/crm` | `public/crm.html` |

### Custom domain

In Vercel → Project → **Domains** → add `rateradar.io` and `www.rateradar.io`.
Point your DNS `A` record to Vercel's IP (shown in the dashboard).

---

## Deploying the backend to Railway

The Express API (scraper + Airtable + email) runs on Railway, not Vercel.

### First deploy

1. Go to [railway.app](https://railway.app) → **New Project** → deploy from GitHub repo.
2. Add environment variables (see below).
3. Railway uses `Procfile` (`web: node index.js`) automatically.

### Environment variables

Copy `.env.example` and fill in all values in Railway's **Variables** tab:

```
AIRTABLE_API_KEY=pat...
AIRTABLE_BASE_ID=app...
RESEND_API_KEY=re_...
PORT=3000
DASHBOARD_URL=https://rateradar.io/dashboard
```

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server health check |
| GET | `/api/clients` | List all clients |
| POST | `/api/clients` | Create a client |
| GET | `/api/competitors/:clientId` | List competitors for a client |
| POST | `/api/competitors` | Add a competitor |
| GET | `/api/prices/:clientId` | Price history for a client |
| GET | `/api/prices/:clientId/tonight` | Tonight's prices |
| GET | `/api/alerts/:clientId` | Alerts for a client |
| GET | `/api/scrape/status` | Last scrape status |
| POST | `/api/scrape/now/:clientId` | Trigger manual scrape |

---

## Running locally

```bash
# Install dependencies
npm install

# Install Playwright browsers (required for scraping)
npx playwright install chromium

# Copy and fill in env file
cp .env.example .env

# Start dev server (auto-restarts on changes)
npm run dev

# Test the API
curl http://localhost:3000/api/health
```

---

## Scheduled jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| Daily scrape | Every day at 06:00 | Scrapes all active competitors for all clients |
| Weekly report | Every Monday at 08:00 | Sends Pro/Premium clients a weekly price summary |

Alerts fire automatically when a competitor drops price by more than the client's threshold (default 10%).
