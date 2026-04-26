require('dotenv').config();
const Airtable = require('airtable');
const { v4: uuidv4 } = require('uuid');

const AIRTABLE_READY = !!(process.env.AIRTABLE_API_KEY && process.env.AIRTABLE_BASE_ID);

let base;
if (AIRTABLE_READY) {
  base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
} else {
  console.warn('[airtable] No API key — running in stub mode. Set AIRTABLE_API_KEY + AIRTABLE_BASE_ID in .env to enable persistence.');
  // Stub table: returns empty reads, throws on writes
  const stubTable = () => ({
    select: () => ({ eachPage: (_fn, _next) => Promise.resolve() }),
    find: async () => { throw new Error('Airtable not configured'); },
    create: async () => { throw new Error('Airtable not configured'); },
    update: async () => { throw new Error('Airtable not configured'); },
    destroy: async () => { throw new Error('Airtable not configured'); },
  });
  base = stubTable;
}

const TABLES = {
  CLIENTS: 'Clients',
  COMPETITORS: 'Competitors',
  PRICE_HISTORY: 'PriceHistory',
  ALERTS: 'Alerts',
};

// ─── Generic helpers ─────────────────────────────────────────────────────────

function flattenRecord(record) {
  return { id: record.id, ...record.fields };
}

async function getAllRecords(tableName, filterFormula = '') {
  const records = [];
  const query = filterFormula
    ? base(tableName).select({ filterByFormula: filterFormula })
    : base(tableName).select();

  await query.eachPage((page, next) => {
    page.forEach((r) => records.push(flattenRecord(r)));
    next();
  });

  return records;
}

async function getRecordById(tableName, recordId) {
  const record = await base(tableName).find(recordId);
  return flattenRecord(record);
}

async function createRecord(tableName, fields) {
  const record = await base(tableName).create(fields);
  return flattenRecord(record);
}

async function updateRecord(tableName, recordId, fields) {
  const record = await base(tableName).update(recordId, fields);
  return flattenRecord(record);
}

async function deleteRecord(tableName, recordId) {
  await base(tableName).destroy(recordId);
  return { deleted: true, id: recordId };
}

// ─── Clients ─────────────────────────────────────────────────────────────────

async function getAllClients() {
  return getAllRecords(TABLES.CLIENTS);
}

async function getActiveClients() {
  return getAllRecords(TABLES.CLIENTS, '{active} = 1');
}

async function getClientByAirtableId(recordId) {
  return getRecordById(TABLES.CLIENTS, recordId);
}

async function getClientByClientId(clientId) {
  const records = await getAllRecords(TABLES.CLIENTS, `{clientId} = "${clientId}"`);
  return records[0] || null;
}

async function createClient(data) {
  const fields = {
    clientId: uuidv4(),
    name: data.name,
    email: data.email,
    hotelName: data.hotelName,
    hotelCity: data.hotelCity,
    currentPrice: data.currentPrice || 0,
    plan: data.plan || 'starter',
    maxCompetitors: data.maxCompetitors || 5,
    alertThreshold: data.alertThreshold || 10,
    alertEmail: data.alertEmail ?? true,
    alertSMS: data.alertSMS ?? false,
    active: data.active ?? true,
    createdAt: new Date().toISOString().split('T')[0],
  };
  return createRecord(TABLES.CLIENTS, fields);
}

async function updateClient(recordId, data) {
  return updateRecord(TABLES.CLIENTS, recordId, data);
}

async function deleteClient(recordId) {
  return deleteRecord(TABLES.CLIENTS, recordId);
}

// ─── Competitors ─────────────────────────────────────────────────────────────

async function getCompetitorsByClientId(clientId) {
  return getAllRecords(TABLES.COMPETITORS, `{clientId} = "${clientId}"`);
}

async function getActiveCompetitorsByClientId(clientId) {
  return getAllRecords(TABLES.COMPETITORS, `AND({clientId} = "${clientId}", {active} = 1)`);
}

async function createCompetitor(data) {
  const fields = {
    competitorId: uuidv4(),
    clientId: data.clientId,
    hotelName: data.hotelName,
    bookingUrl: data.bookingUrl || '',
    city: data.city || '',
    active: data.active ?? true,
    addedAt: new Date().toISOString().split('T')[0],
  };
  return createRecord(TABLES.COMPETITORS, fields);
}

async function updateCompetitor(recordId, data) {
  return updateRecord(TABLES.COMPETITORS, recordId, data);
}

async function deleteCompetitor(recordId) {
  return deleteRecord(TABLES.COMPETITORS, recordId);
}

// ─── PriceHistory ─────────────────────────────────────────────────────────────

async function savePriceRecord(data) {
  const fields = {
    priceId: uuidv4(),
    competitorId: data.competitorId,
    clientId: data.clientId,
    hotelName: data.hotelName,
    price: data.price,
    currency: data.currency || 'EUR',
    rating: data.rating || null,
    reviewCount: data.reviewCount || null,
    checkInDate: data.checkInDate,
    scrapedAt: new Date().toISOString().split('T')[0],
    roomType: data.roomType || '',
    freeCancellation: data.freeCancellation ?? false,
  };
  return createRecord(TABLES.PRICE_HISTORY, fields);
}

async function getLatestPricesForClient(clientId) {
  return getAllRecords(TABLES.PRICE_HISTORY, `{clientId} = "${clientId}"`);
}

async function getPriceHistoryForClient(clientId) {
  return getAllRecords(TABLES.PRICE_HISTORY, `{clientId} = "${clientId}"`);
}

async function getTonightPricesForClient(clientId) {
  const tonight = new Date().toISOString().split('T')[0];
  return getAllRecords(
    TABLES.PRICE_HISTORY,
    `AND({clientId} = "${clientId}", {checkInDate} = "${tonight}")`
  );
}

async function getLatestPriceForCompetitor(competitorId) {
  const records = await getAllRecords(
    TABLES.PRICE_HISTORY,
    `{competitorId} = "${competitorId}"`
  );
  if (!records.length) return null;
  return records.sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt))[0];
}

// ─── Alerts ───────────────────────────────────────────────────────────────────

async function getAlertsForClient(clientId) {
  return getAllRecords(TABLES.ALERTS, `{clientId} = "${clientId}"`);
}

async function saveAlert(data) {
  const fields = {
    alertId: uuidv4(),
    clientId: data.clientId,
    competitorName: data.competitorName,
    oldPrice: data.oldPrice,
    newPrice: data.newPrice,
    changePercent: data.changePercent,
    sentAt: new Date().toISOString().split('T')[0],
    emailSent: data.emailSent ?? false,
  };
  return createRecord(TABLES.ALERTS, fields);
}

module.exports = {
  TABLES,
  getAllClients,
  getActiveClients,
  getClientByAirtableId,
  getClientByClientId,
  createClient,
  updateClient,
  deleteClient,
  getCompetitorsByClientId,
  getActiveCompetitorsByClientId,
  createCompetitor,
  updateCompetitor,
  deleteCompetitor,
  savePriceRecord,
  getLatestPricesForClient,
  getPriceHistoryForClient,
  getTonightPricesForClient,
  getLatestPriceForCompetitor,
  getAlertsForClient,
  saveAlert,
};
