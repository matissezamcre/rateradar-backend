const { chromium } = require('playwright');

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

let scrapeStatus = {
  lastRun: null,
  lastSuccess: null,
  totalScraped: 0,
  errors: [],
};

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').split('.')[0];
  console.log(`[${ts}] ${msg}`);
}

function randomDelay(min = 2000, max = 5000) {
  return new Promise((r) => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));
}

function randomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function formatBookingDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildBookingUrl(baseUrl, checkIn, checkOut) {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('checkin', formatBookingDate(checkIn));
    url.searchParams.set('checkout', formatBookingDate(checkOut));
    return url.toString();
  } catch {
    return baseUrl;
  }
}

async function scrapeHotelPrice(bookingUrl, checkInDate, checkOutDate, retries = 3) {
  let browser = null;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: randomUserAgent(),
        viewport: { width: 1920, height: 1080 },
        locale: 'fr-FR',
        extraHTTPHeaders: {
          'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
        },
      });

      const page = await context.newPage();
      const targetUrl = buildBookingUrl(bookingUrl, checkInDate, checkOutDate);

      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Wait for price elements — Booking.com can be slow to hydrate
      await page.waitForSelector('[data-testid="price-and-discounted-price"], .prco-valign-middle-helper', {
        timeout: 15000,
      }).catch(() => {});

      await randomDelay(1500, 3000);

      const data = await page.evaluate(() => {
        // Price
        let price = null;
        const priceEl =
          document.querySelector('[data-testid="price-and-discounted-price"]') ||
          document.querySelector('.prco-valign-middle-helper') ||
          document.querySelector('[class*="price"]');
        if (priceEl) {
          const raw = priceEl.textContent.replace(/[^\d,\.]/g, '').replace(',', '.');
          price = parseFloat(raw) || null;
        }

        // Rating
        let rating = null;
        const ratingEl =
          document.querySelector('[data-testid="review-score-right-component"] .a3b8729ab1') ||
          document.querySelector('.review-score-badge') ||
          document.querySelector('[class*="review-score"]');
        if (ratingEl) {
          rating = parseFloat(ratingEl.textContent.trim().replace(',', '.')) || null;
        }

        // Review count
        let reviewCount = null;
        const reviewEl =
          document.querySelector('[data-testid="review-score-right-component"] .d8eab2cf7f') ||
          document.querySelector('.review-score-widget__subtext');
        if (reviewEl) {
          const match = reviewEl.textContent.match(/[\d\s]+/);
          if (match) reviewCount = parseInt(match[0].replace(/\s/g, ''), 10) || null;
        }

        // Room type
        let roomType = '';
        const roomEl =
          document.querySelector('[data-testid="recommended-units"] h4') ||
          document.querySelector('.hprt-roomtype-link');
        if (roomEl) roomType = roomEl.textContent.trim();

        // Free cancellation
        const freeCancellation =
          !!document.querySelector('[data-testid="free-cancellation"]') ||
          !!document.querySelector('.freecancellation');

        // Currency
        const currencyEl = document.querySelector('[data-testid="price-and-discounted-price"]');
        let currency = 'EUR';
        if (currencyEl) {
          const text = currencyEl.textContent;
          if (text.includes('$')) currency = 'USD';
          else if (text.includes('£')) currency = 'GBP';
        }

        return { price, rating, reviewCount, roomType, freeCancellation, currency };
      });

      await browser.close();

      if (!data.price) {
        throw new Error('Could not extract price from page');
      }

      return data;
    } catch (err) {
      if (browser) await browser.close().catch(() => {});

      log(`Attempt ${attempt}/${retries} failed for ${bookingUrl}: ${err.message}`);

      if (attempt === retries) {
        throw err;
      }

      const waitMs = err.message.includes('block') || err.message.includes('403')
        ? 60 * 60 * 1000  // 1 hour if blocked
        : 30 * 60 * 1000; // 30 min otherwise

      log(`Waiting ${waitMs / 60000} minutes before retry...`);
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }
}

async function searchHotelOnBooking(hotelName, city, checkIn, checkOut) {
  let browser = null;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: randomUserAgent(),
      viewport: { width: 1920, height: 1080 },
      locale: 'fr-FR',
    });

    const page = await context.newPage();
    const query = encodeURIComponent(`${hotelName} ${city}`);
    const checkInFmt = formatBookingDate(checkIn);
    const checkOutFmt = formatBookingDate(checkOut);

    await page.goto(
      `https://www.booking.com/search.html?ss=${query}&checkin=${checkInFmt}&checkout=${checkOutFmt}&lang=fr`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );

    await page.waitForSelector('[data-testid="property-card"]', { timeout: 15000 }).catch(() => {});
    await randomDelay();

    const hotelUrl = await page.evaluate(() => {
      const card = document.querySelector('[data-testid="property-card"] a[data-testid="title-link"]');
      return card ? card.href : null;
    });

    await browser.close();

    if (!hotelUrl) {
      throw new Error(`No results found for "${hotelName}" in "${city}"`);
    }

    return scrapeHotelPrice(hotelUrl, checkIn, checkOut);
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    throw err;
  }
}

// Scrape a competitor for multiple check-in dates
async function scrapeCompetitorDates(competitor, dates) {
  const results = [];

  for (const checkIn of dates) {
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 1);

    try {
      let data;
      if (competitor.bookingUrl) {
        data = await scrapeHotelPrice(competitor.bookingUrl, checkIn, checkOut);
      } else {
        data = await searchHotelOnBooking(competitor.hotelName, competitor.city, checkIn, checkOut);
      }

      results.push({
        ...data,
        competitorId: competitor.competitorId,
        clientId: competitor.clientId,
        hotelName: competitor.hotelName,
        checkInDate: formatBookingDate(checkIn),
        success: true,
      });

      log(`Scraped ${competitor.hotelName}: €${data.price}/night (${formatBookingDate(checkIn)})`);
    } catch (err) {
      log(`Failed to scrape ${competitor.hotelName} for ${formatBookingDate(checkIn)}: ${err.message}`);
      results.push({
        competitorId: competitor.competitorId,
        clientId: competitor.clientId,
        hotelName: competitor.hotelName,
        checkInDate: formatBookingDate(checkIn),
        success: false,
        error: err.message,
      });
    }

    // Enforce minimum 3 seconds between requests
    await randomDelay(3000, 5000);
  }

  return results;
}

// Build the list of dates to scrape: tonight + next 7 days + next weekend
function buildScrapeDates() {
  const dates = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Tonight + next 7 days
  for (let i = 0; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }

  // Next weekend (ensure Saturday/Sunday are included even if > 7 days away)
  const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
  const daysUntilSat = dayOfWeek <= 6 ? (6 - dayOfWeek + 7) % 7 || 7 : 1;
  const nextSat = new Date(today);
  nextSat.setDate(today.getDate() + daysUntilSat);
  const nextSun = new Date(nextSat);
  nextSun.setDate(nextSat.getDate() + 1);

  [nextSat, nextSun].forEach((d) => {
    if (!dates.find((x) => x.toDateString() === d.toDateString())) {
      dates.push(d);
    }
  });

  return dates;
}

function getScrapeStatus() {
  return scrapeStatus;
}

function updateScrapeStatus(updates) {
  scrapeStatus = { ...scrapeStatus, ...updates };
}

module.exports = {
  scrapeHotelPrice,
  searchHotelOnBooking,
  scrapeCompetitorDates,
  buildScrapeDates,
  getScrapeStatus,
  updateScrapeStatus,
  log,
};
