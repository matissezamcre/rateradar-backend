const express = require('express');
const router = express.Router();
const db = require('../airtable');

// GET /api/prices/:clientId — latest prices (most recent per competitor)
router.get('/:clientId', async (req, res) => {
  try {
    const history = await db.getLatestPricesForClient(req.params.clientId);

    // Deduplicate: keep only the most recent record per competitor
    const latestByCompetitor = {};
    for (const record of history) {
      const existing = latestByCompetitor[record.competitorId];
      if (!existing || new Date(record.scrapedAt) > new Date(existing.scrapedAt)) {
        latestByCompetitor[record.competitorId] = record;
      }
    }

    res.json({ success: true, data: Object.values(latestByCompetitor) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/prices/:clientId/history — full history
router.get('/:clientId/history', async (req, res) => {
  try {
    const history = await db.getPriceHistoryForClient(req.params.clientId);
    res.json({ success: true, data: history });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/prices/:clientId/tonight — tonight's prices only
router.get('/:clientId/tonight', async (req, res) => {
  try {
    const prices = await db.getTonightPricesForClient(req.params.clientId);
    res.json({ success: true, data: prices });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
