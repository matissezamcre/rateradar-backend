const cron = require('node-cron');
const db = require('./airtable');
const { scrapeCompetitorDates, buildScrapeDates, log, updateScrapeStatus } = require('./scraper');
const { sendPriceDropAlert, sendWeeklyReport } = require('./mailer');

// ─── Daily scrape — every day at 6:00 AM ─────────────────────────────────────

cron.schedule('0 6 * * *', async () => {
  log('Starting daily scrape...');
  updateScrapeStatus({ lastRun: new Date().toISOString() });

  try {
    const clients = await db.getActiveClients();
    log(`Daily scrape for ${clients.length} clients`);

    let totalScraped = 0;

    for (const client of clients) {
      try {
        const competitors = await db.getActiveCompetitorsByClientId(client.clientId);

        if (!competitors.length) {
          log(`No active competitors for ${client.hotelName} — skipping`);
          continue;
        }

        const dates = buildScrapeDates();

        for (const competitor of competitors) {
          const results = await scrapeCompetitorDates(competitor, dates);

          for (const result of results) {
            if (!result.success) continue;

            // Save to PriceHistory
            await db.savePriceRecord(result).catch((e) =>
              log(`Failed to save price record for ${result.hotelName}: ${e.message}`)
            );

            totalScraped++;

            // Check alert threshold — compare against previous price
            await checkAndSendAlert({ client, competitor, newPriceData: result });
          }
        }
      } catch (err) {
        log(`Error scraping for client ${client.hotelName}: ${err.message}`);
      }
    }

    updateScrapeStatus({
      lastSuccess: new Date().toISOString(),
      totalScraped,
      errors: [],
    });

    log(`Daily scrape complete — ${totalScraped} records saved`);
  } catch (err) {
    log(`Daily scrape failed: ${err.message}`);
    updateScrapeStatus({ errors: [{ message: err.message, at: new Date().toISOString() }] });
  }
});

// ─── Weekly report — every Monday at 8:00 AM ─────────────────────────────────

cron.schedule('0 8 * * 1', async () => {
  log('Starting weekly report generation...');

  try {
    const clients = await db.getActiveClients();
    const eligibleClients = clients.filter((c) => c.plan === 'pro' || c.plan === 'premium');

    log(`Sending weekly reports to ${eligibleClients.length} Pro/Premium clients`);

    for (const client of eligibleClients) {
      try {
        const competitors = await db.getActiveCompetitorsByClientId(client.clientId);
        const priceHistory = await db.getPriceHistoryForClient(client.clientId);

        await sendWeeklyReport({ client, priceHistory, competitors });
        log(`Weekly report sent to ${client.email}`);
      } catch (err) {
        log(`Failed to send weekly report to ${client.email}: ${err.message}`);
      }
    }

    log('Weekly report generation complete');
  } catch (err) {
    log(`Weekly report job failed: ${err.message}`);
  }
});

// ─── Alert helper ─────────────────────────────────────────────────────────────

async function checkAndSendAlert({ client, competitor, newPriceData }) {
  try {
    const previous = await db.getLatestPriceForCompetitor(competitor.competitorId);

    if (!previous || !previous.price || !newPriceData.price) return;

    // Ignore if same check-in date and same scraped day (prevent duplicate alerts)
    if (previous.scrapedAt === newPriceData.checkInDate) return;

    const changePercent = ((newPriceData.price - previous.price) / previous.price) * 100;
    const threshold = client.alertThreshold || 10;

    // Only alert on drops, not increases
    if (changePercent >= 0 || Math.abs(changePercent) < threshold) return;

    log(`Alert: ${competitor.hotelName} dropped ${Math.abs(changePercent).toFixed(1)}% (${previous.price}→${newPriceData.price}) for client ${client.hotelName}`);

    // Get all latest competitor prices for position context
    const allHistory = await db.getLatestPricesForClient(client.clientId);
    const latestByCompetitor = {};
    for (const r of allHistory) {
      if (!latestByCompetitor[r.competitorId] || new Date(r.scrapedAt) > new Date(latestByCompetitor[r.competitorId].scrapedAt)) {
        latestByCompetitor[r.competitorId] = r;
      }
    }
    const allCompetitors = Object.values(latestByCompetitor);

    if (client.alertEmail && client.email) {
      await sendPriceDropAlert({
        client,
        competitorName: competitor.hotelName,
        oldPrice: previous.price,
        newPrice: newPriceData.price,
        changePercent,
        allCompetitors,
      }).catch((e) => log(`Failed to send alert email: ${e.message}`));
    }

    await db.saveAlert({
      clientId: client.clientId,
      competitorName: competitor.hotelName,
      oldPrice: previous.price,
      newPrice: newPriceData.price,
      changePercent: Math.round(changePercent * 10) / 10,
      emailSent: !!(client.alertEmail && client.email),
    }).catch((e) => log(`Failed to save alert record: ${e.message}`));
  } catch (err) {
    log(`checkAndSendAlert error: ${err.message}`);
  }
}

module.exports = { checkAndSendAlert };
