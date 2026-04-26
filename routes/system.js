const express = require('express');
const router = express.Router();
const { getScrapeStatus, scrapeCompetitorDates, buildScrapeDates, log, updateScrapeStatus } = require('../scraper');
const db = require('../airtable');

// GET /api/health
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// GET /api/scrape/status
router.get('/scrape/status', (req, res) => {
  res.json({ success: true, data: getScrapeStatus() });
});

// POST /api/scrape/now/:clientId — trigger manual scrape for one client
router.post('/scrape/now/:clientId', async (req, res) => {
  // Respond immediately so the caller isn't left waiting
  res.json({ success: true, message: 'Scrape started in background' });

  try {
    const client = await db.getClientByAirtableId(req.params.clientId);
    if (!client) {
      log(`Manual scrape: client ${req.params.clientId} not found`);
      return;
    }

    const competitors = await db.getActiveCompetitorsByClientId(client.clientId);
    if (!competitors.length) {
      log(`Manual scrape: no active competitors for ${client.hotelName}`);
      return;
    }

    log(`Manual scrape triggered for ${client.hotelName} (${competitors.length} competitors)`);

    const dates = buildScrapeDates();

    for (const competitor of competitors) {
      const results = await scrapeCompetitorDates(competitor, dates);

      for (const result of results) {
        if (result.success) {
          await db.savePriceRecord(result).catch((e) =>
            log(`Failed to save price record: ${e.message}`)
          );
        }
      }
    }

    updateScrapeStatus({ lastRun: new Date().toISOString(), lastSuccess: new Date().toISOString() });
    log(`Manual scrape complete for ${client.hotelName}`);
  } catch (err) {
    log(`Manual scrape error: ${err.message}`);
  }
});

module.exports = router;
