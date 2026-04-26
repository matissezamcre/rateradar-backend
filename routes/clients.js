const express = require('express');
const router = express.Router();
const db = require('../airtable');
const { sendWelcomeEmail } = require('../mailer');

// GET /api/clients
router.get('/', async (req, res) => {
  try {
    const clients = await db.getAllClients();
    res.json({ success: true, data: clients });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/clients/:id
router.get('/:id', async (req, res) => {
  try {
    const client = await db.getClientByAirtableId(req.params.id);
    res.json({ success: true, data: client });
  } catch (err) {
    res.status(404).json({ success: false, error: 'Client not found' });
  }
});

// POST /api/clients
router.post('/', async (req, res) => {
  try {
    const required = ['name', 'email', 'hotelName', 'hotelCity'];
    for (const field of required) {
      if (!req.body[field]) {
        return res.status(400).json({ success: false, error: `Missing required field: ${field}` });
      }
    }

    const client = await db.createClient(req.body);

    // Send welcome email (non-blocking)
    sendWelcomeEmail({ client }).catch((err) =>
      console.error(`Failed to send welcome email: ${err.message}`)
    );

    res.status(201).json({ success: true, data: client });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/clients/:id
router.put('/:id', async (req, res) => {
  try {
    const updated = await db.updateClient(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/clients/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.deleteClient(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
