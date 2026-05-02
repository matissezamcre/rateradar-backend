const express = require('express');
const router = express.Router();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'RateRadar <hello@rateradar.info>';

// POST /api/send-email
// Body: { to, subject, html, type? }
router.post('/', async (req, res) => {
  const { to, subject, html, type = 'transactional' } = req.body;

  if (!to || !subject || !html) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: to, subject, html',
    });
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error(`[email] ✗ ${type} → ${to} | ${error.message}`);
      return res.status(500).json({ success: false, error: error.message });
    }

    console.log(`[email] ✓ ${type} → ${to} | id: ${data.id}`);
    res.json({ success: true, id: data.id });
  } catch (err) {
    console.error(`[email] ✗ unexpected: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
