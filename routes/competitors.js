const express = require('express');
const router = express.Router();
const db = require('../airtable');

// GET /api/competitors/:clientId
router.get('/:clientId', async (req, res) => {
  try {
    const competitors = await db.getCompetitorsByClientId(req.params.clientId);
    res.json({ success: true, data: competitors });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/competitors
router.post('/', async (req, res) => {
  try {
    const required = ['clientId', 'hotelName'];
    for (const field of required) {
      if (!req.body[field]) {
        return res.status(400).json({ success: false, error: `Missing required field: ${field}` });
      }
    }

    // Enforce plan limits
    const client = await db.getClientByClientId(req.body.clientId).catch(() => null);
    if (client) {
      const existing = await db.getCompetitorsByClientId(req.body.clientId);
      const active = existing.filter((c) => c.active);
      if (active.length >= (client.maxCompetitors || 5)) {
        return res.status(403).json({
          success: false,
          error: `Competitor limit reached for your plan (max ${client.maxCompetitors}). Please upgrade.`,
        });
      }
    }

    const competitor = await db.createCompetitor(req.body);
    res.status(201).json({ success: true, data: competitor });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/competitors/:id
router.put('/:id', async (req, res) => {
  try {
    const updated = await db.updateCompetitor(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/competitors/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.deleteCompetitor(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
