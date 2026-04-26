const express = require('express');
const router = express.Router();
const db = require('../airtable');
const { sendPriceDropAlert } = require('../mailer');

// GET /api/alerts/:clientId
router.get('/:clientId', async (req, res) => {
  try {
    const alerts = await db.getAlertsForClient(req.params.clientId);
    // Return most recent first
    const sorted = alerts.sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
    res.json({ success: true, data: sorted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/alerts/test/:clientId — send a test alert
router.post('/test/:clientId', async (req, res) => {
  try {
    const client = await db.getClientByAirtableId(req.params.clientId);
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    await sendPriceDropAlert({
      client,
      competitorName: 'Hôtel Test Concurrent',
      oldPrice: 189,
      newPrice: 149,
      changePercent: -21.2,
      allCompetitors: [
        { hotelName: 'Hôtel Test Concurrent', price: 149 },
        { hotelName: 'Autre Hôtel', price: 210 },
      ],
    });

    res.json({ success: true, message: `Test alert sent to ${client.email}` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
