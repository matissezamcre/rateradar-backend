# Graph Report - .  (2026-04-28)

## Corpus Check
- Corpus is ~30,780 words - fits in a single context window. You may not need a graph.

## Summary
- 99 nodes · 178 edges · 8 communities detected
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.83)
- Token cost: 6,200 input · 1,800 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Frontend UI Layer|Frontend UI Layer]]
- [[_COMMUNITY_Backend & Data Store|Backend & Data Store]]
- [[_COMMUNITY_Scraper Engine|Scraper Engine]]
- [[_COMMUNITY_Airtable Query Layer|Airtable Query Layer]]
- [[_COMMUNITY_Email & Mailer|Email & Mailer]]
- [[_COMMUNITY_Airtable Write Operations|Airtable Write Operations]]
- [[_COMMUNITY_Airtable Record Helpers|Airtable Record Helpers]]
- [[_COMMUNITY_RateRadar Product|RateRadar Product]]

## God Nodes (most connected - your core abstractions)
1. `getAllRecords()` - 12 edges
2. `Express Backend (index.js)` - 12 edges
3. `scrapeHotelPrice()` - 8 edges
4. `createRecord()` - 7 edges
5. `searchHotelOnBooking()` - 7 edges
6. `scrapeCompetitorDates()` - 7 edges
7. `checkAndSendAlert()` - 7 edges
8. `Marketing Site (index.html)` - 7 edges
9. `Client Dashboard (dashboard.html)` - 7 edges
10. `Airtable ORM (airtable.js)` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Client Dashboard (dashboard.html)` --calls--> `Express Backend (index.js)`  [INFERRED]
  dashboard.html → index.js
- `Internal CRM (crm.html)` --calls--> `Express Backend (index.js)`  [INFERRED]
  crm.html → index.js
- `Admin Panel (Marketing Site)` --semantically_similar_to--> `Internal CRM (crm.html)`  [INFERRED] [semantically similar]
  index.html → crm.html
- `Express Backend (index.js)` --references--> `Railway (Backend Hosting)`  [EXTRACTED]
  index.js → README.md
- `Airtable ORM (airtable.js)` --calls--> `Airtable Database`  [EXTRACTED]
  airtable.js → README.md

## Hyperedges (group relationships)
- **Scrape → Store → Alert Pipeline** — scraper_playwright, airtable_orm, mailer_resend, price_alert_concept [EXTRACTED 0.95]
- **Frontend Triad: Marketing, Dashboard, CRM** — index_marketing_site, dashboard_client, crm_internal [EXTRACTED 1.00]
- **Scheduled Job Flow (scrape + weekly report)** — scheduler_cron, daily_scrape_job, weekly_report_job [EXTRACTED 1.00]

## Communities

### Community 0 - "Frontend UI Layer"
Cohesion: 0.13
Nodes (18): Admin Banner (dashboard.html), Admin Panel (Marketing Site), Auth Modal (login/register), Chart.js Library, Contact Form (index.html), Internal CRM (crm.html), CRM Pipeline Kanban Board, CRM Side Panel (prospect detail) (+10 more)

### Community 1 - "Backend & Data Store"
Cohesion: 0.2
Nodes (16): Airtable Database, Airtable ORM (airtable.js), Express Backend (index.js), Booking.com (external data source), Daily Scrape Job (06:00 cron), Resend Email Mailer (mailer.js), Price Alert (threshold-based notification), Railway (Backend Hosting) (+8 more)

### Community 2 - "Scraper Engine"
Cohesion: 0.46
Nodes (11): buildBookingUrl(), buildScrapeDates(), formatBookingDate(), getScrapeStatus(), log(), randomDelay(), randomUserAgent(), scrapeCompetitorDates() (+3 more)

### Community 3 - "Airtable Query Layer"
Cohesion: 0.32
Nodes (11): getActiveClients(), getActiveCompetitorsByClientId(), getAlertsForClient(), getAllClients(), getAllRecords(), getClientByClientId(), getCompetitorsByClientId(), getLatestPriceForCompetitor() (+3 more)

### Community 4 - "Email & Mailer"
Cohesion: 0.33
Nodes (7): buildWeeklySummary(), computePosition(), getWeekRange(), sendPriceDropAlert(), sendWeeklyReport(), sendWelcomeEmail(), checkAndSendAlert()

### Community 5 - "Airtable Write Operations"
Cohesion: 0.33
Nodes (9): createClient(), createCompetitor(), createRecord(), deleteClient(), deleteCompetitor(), deleteRecord(), saveAlert(), savePriceRecord() (+1 more)

### Community 6 - "Airtable Record Helpers"
Cohesion: 0.33
Nodes (6): flattenRecord(), getClientByAirtableId(), getRecordById(), updateClient(), updateCompetitor(), updateRecord()

### Community 19 - "RateRadar Product"
Cohesion: 1.0
Nodes (1): RateRadar

## Knowledge Gaps
- **11 isolated node(s):** `RateRadar`, `Booking.com (external data source)`, `Airtable Database`, `Vercel (Frontend Hosting)`, `Railway (Backend Hosting)` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `RateRadar Product`** (1 nodes): `RateRadar`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `checkAndSendAlert()` connect `Email & Mailer` to `Scraper Engine`, `Airtable Query Layer`, `Airtable Write Operations`?**
  _High betweenness centrality (0.167) - this node is a cross-community bridge._
- **Why does `log()` connect `Scraper Engine` to `Email & Mailer`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Why does `Express Backend (index.js)` connect `Backend & Data Store` to `Frontend UI Layer`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `Express Backend (index.js)` (e.g. with `Client Dashboard (dashboard.html)` and `Internal CRM (crm.html)`) actually correct?**
  _`Express Backend (index.js)` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RateRadar`, `Booking.com (external data source)`, `Airtable Database` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend UI Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._