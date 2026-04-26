require('dotenv').config();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = 'alerts@rateradar.io';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://rateradar.io';

// ─── Price drop alert ─────────────────────────────────────────────────────────

async function sendPriceDropAlert({ client, competitorName, oldPrice, newPrice, changePercent, allCompetitors }) {
  const changeAbs = Math.abs(changePercent).toFixed(1);
  const position = computePosition(client.currentPrice, allCompetitors);

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerte prix RateRadar</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: #1a1a2e; color: #fff; padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .header p { margin: 6px 0 0; opacity: .7; font-size: 14px; }
    .body { padding: 28px 32px; }
    .alert-box { background: #fff5f5; border: 1.5px solid #fc8181; border-radius: 10px; padding: 20px; margin-bottom: 24px; }
    .alert-box h2 { margin: 0 0 12px; font-size: 18px; color: #c53030; }
    .price-row { display: flex; align-items: center; gap: 16px; margin-top: 8px; }
    .old-price { font-size: 18px; color: #718096; text-decoration: line-through; }
    .arrow { font-size: 20px; color: #c53030; }
    .new-price { font-size: 24px; font-weight: 700; color: #c53030; }
    .badge { display: inline-block; background: #fc8181; color: #fff; border-radius: 6px; padding: 4px 10px; font-size: 13px; font-weight: 600; margin-top: 10px; }
    .position-box { background: #f0fff4; border: 1.5px solid #68d391; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; }
    .position-box h3 { margin: 0 0 8px; font-size: 15px; color: #276749; }
    .position-box p { margin: 0; color: #2f855a; font-size: 14px; }
    .recommendation { background: #ebf8ff; border-left: 4px solid #4299e1; border-radius: 6px; padding: 14px 18px; margin-bottom: 24px; font-size: 14px; color: #2b6cb0; }
    .btn { display: inline-block; background: #1a1a2e; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; }
    .footer { padding: 20px 32px; background: #f7fafc; font-size: 12px; color: #a0aec0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Alerte Prix RateRadar</h1>
      <p>${client.hotelName} — ${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
    <div class="body">
      <div class="alert-box">
        <h2>${competitorName} a baissé ses prix de ${changeAbs}%</h2>
        <div class="price-row">
          <span class="old-price">€${oldPrice}</span>
          <span class="arrow">→</span>
          <span class="new-price">€${newPrice}</span>
        </div>
        <span class="badge">−${changeAbs}%</span>
      </div>

      <div class="position-box">
        <h3>Votre position actuelle</h3>
        <p>${position}</p>
      </div>

      <div class="recommendation">
        💡 <strong>Action recommandée :</strong> Vérifiez si une réduction de vos tarifs est pertinente pour rester compétitif sur les prochains jours.
      </div>

      <a href="${DASHBOARD_URL}" class="btn">Voir le dashboard →</a>
    </div>
    <div class="footer">
      Vous recevez cet email car vous êtes abonné aux alertes RateRadar.<br>
      ${client.hotelName} · ${client.hotelCity}
    </div>
  </div>
</body>
</html>
  `.trim();

  const { error } = await resend.emails.send({
    from: FROM,
    to: client.email,
    subject: `⚠️ ${competitorName} a baissé ses prix de ${changeAbs}%`,
    html,
  });

  if (error) throw new Error(error.message);
  return true;
}

// ─── Weekly report ────────────────────────────────────────────────────────────

async function sendWeeklyReport({ client, priceHistory, competitors }) {
  const now = new Date();
  const weekRange = getWeekRange();
  const summary = buildWeeklySummary(priceHistory, competitors);

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport hebdomadaire RateRadar</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: #1a1a2e; color: #fff; padding: 28px 32px; }
    .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
    .header p { margin: 6px 0 0; opacity: .7; font-size: 14px; }
    .body { padding: 28px 32px; }
    .section { margin-bottom: 28px; }
    .section h2 { font-size: 16px; font-weight: 700; margin: 0 0 14px; color: #1a1a2e; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    .stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .stat-card { background: #f7fafc; border-radius: 8px; padding: 14px; text-align: center; }
    .stat-card .value { font-size: 24px; font-weight: 700; color: #1a1a2e; }
    .stat-card .label { font-size: 12px; color: #718096; margin-top: 4px; }
    .competitor-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .competitor-row:last-child { border-bottom: none; }
    .chip { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .chip.down { background: #fed7d7; color: #c53030; }
    .chip.up { background: #c6f6d5; color: #276749; }
    .chip.stable { background: #e2e8f0; color: #4a5568; }
    .btn { display: inline-block; background: #1a1a2e; color: #fff; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; }
    .footer { padding: 20px 32px; background: #f7fafc; font-size: 12px; color: #a0aec0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Rapport hebdomadaire RateRadar</h1>
      <p>${client.hotelName} · Semaine du ${weekRange}</p>
    </div>
    <div class="body">

      <div class="section">
        <h2>Résumé de la semaine</h2>
        <div class="stat-grid">
          <div class="stat-card">
            <div class="value">€${summary.yourAvgPrice}</div>
            <div class="label">Votre prix moyen</div>
          </div>
          <div class="stat-card">
            <div class="value">€${summary.competitorAvgPrice}</div>
            <div class="label">Moyenne concurrents</div>
          </div>
          <div class="stat-card">
            <div class="value">${summary.positionRank}</div>
            <div class="label">Votre position</div>
          </div>
          <div class="stat-card">
            <div class="value">${summary.alertCount}</div>
            <div class="label">Alertes envoyées</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Évolution des concurrents</h2>
        ${summary.competitorRows}
      </div>

      <div class="section">
        <h2>Prévisions week-end prochain</h2>
        <p style="font-size:14px;color:#4a5568;">${summary.weekendForecast}</p>
      </div>

      <a href="${DASHBOARD_URL}" class="btn">Voir l'historique complet →</a>
    </div>
    <div class="footer">
      Rapport hebdomadaire RateRadar · Plan ${client.plan}<br>
      ${client.hotelName} · ${client.hotelCity}
    </div>
  </div>
</body>
</html>
  `.trim();

  const { error } = await resend.emails.send({
    from: FROM,
    to: client.email,
    subject: `📊 Votre rapport hebdomadaire RateRadar — ${weekRange}`,
    html,
  });

  if (error) throw new Error(error.message);
  return true;
}

// ─── Welcome email ────────────────────────────────────────────────────────────

async function sendWelcomeEmail({ client }) {
  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur RateRadar</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: #fff; padding: 36px 32px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; font-weight: 800; }
    .header p { margin: 10px 0 0; opacity: .8; font-size: 16px; }
    .body { padding: 32px; }
    .steps { list-style: none; padding: 0; margin: 0 0 28px; }
    .steps li { display: flex; align-items: flex-start; gap: 16px; padding: 16px 0; border-bottom: 1px solid #e2e8f0; }
    .steps li:last-child { border-bottom: none; }
    .step-num { background: #1a1a2e; color: #fff; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; font-size: 14px; }
    .step-text h3 { margin: 0 0 4px; font-size: 15px; }
    .step-text p { margin: 0; font-size: 13px; color: #718096; }
    .btn { display: block; text-align: center; background: #1a1a2e; color: #fff; padding: 16px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; margin-bottom: 24px; }
    .support { background: #f7fafc; border-radius: 8px; padding: 16px; font-size: 13px; color: #718096; text-align: center; }
    .footer { padding: 20px 32px; background: #f7fafc; font-size: 12px; color: #a0aec0; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Bienvenue sur RateRadar !</h1>
      <p>Bonjour ${client.name}, votre compte est prêt.</p>
    </div>
    <div class="body">
      <p style="font-size:15px;color:#4a5568;margin:0 0 24px;">RateRadar surveille automatiquement les prix de vos concurrents et vous alerte dès qu'une opportunité se présente.</p>

      <ol class="steps">
        <li>
          <div class="step-num">1</div>
          <div class="step-text">
            <h3>Ajoutez vos concurrents</h3>
            <p>Renseignez les URLs Booking.com de vos principaux concurrents dans votre dashboard.</p>
          </div>
        </li>
        <li>
          <div class="step-num">2</div>
          <div class="step-text">
            <h3>Configurez vos alertes</h3>
            <p>Choisissez le seuil de variation de prix (défaut : 10%) qui déclenche une alerte.</p>
          </div>
        </li>
        <li>
          <div class="step-num">3</div>
          <div class="step-text">
            <h3>Recevez vos analyses</h3>
            <p>Chaque matin à 6h, nos robots collectent les prix et vous informent des changements.</p>
          </div>
        </li>
      </ol>

      <a href="${DASHBOARD_URL}" class="btn">Accéder à mon dashboard →</a>

      <div class="support">
        Des questions ? Contactez-nous à <a href="mailto:support@rateradar.io" style="color:#1a1a2e;">support@rateradar.io</a>
      </div>
    </div>
    <div class="footer">
      RateRadar · Plan ${client.plan} · ${client.hotelName}
    </div>
  </div>
</body>
</html>
  `.trim();

  const { error } = await resend.emails.send({
    from: FROM,
    to: client.email,
    subject: `🎉 Bienvenue sur RateRadar, ${client.name} !`,
    html,
  });

  if (error) throw new Error(error.message);
  return true;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computePosition(yourPrice, allCompetitors) {
  if (!allCompetitors || !allCompetitors.length) {
    return `Votre tarif actuel : €${yourPrice}/nuit`;
  }
  const prices = allCompetitors.map((c) => c.price).filter(Boolean).sort((a, b) => a - b);
  const rank = prices.filter((p) => p < yourPrice).length + 1;
  const total = prices.length + 1;
  const avg = Math.round(prices.reduce((s, p) => s + p, 0) / prices.length);

  let posText = `${rank}ème sur ${total} hôtels`;
  if (yourPrice < avg) posText += ` — €${avg - yourPrice} en dessous de la moyenne (€${avg})`;
  else if (yourPrice > avg) posText += ` — €${yourPrice - avg} au dessus de la moyenne (€${avg})`;
  else posText += ` — dans la moyenne (€${avg})`;

  return `Votre prix (€${yourPrice}) · ${posText}`;
}

function getWeekRange() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - now.getDay() + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

function buildWeeklySummary(priceHistory, competitors) {
  const yourAvgPrice = '—';
  const alertCount = 0;

  // Compute per-competitor trend
  const competitorRows = competitors.map((comp) => {
    const records = priceHistory.filter((r) => r.competitorId === comp.competitorId);
    if (!records.length) {
      return `<div class="competitor-row"><span>${comp.hotelName}</span><span class="chip stable">Aucune donnée</span></div>`;
    }
    const sorted = records.sort((a, b) => new Date(a.scrapedAt) - new Date(b.scrapedAt));
    const first = sorted[0].price;
    const last = sorted[sorted.length - 1].price;
    const avg = Math.round(records.reduce((s, r) => s + r.price, 0) / records.length);
    const delta = last - first;
    const pct = first ? ((delta / first) * 100).toFixed(1) : 0;
    const chip = delta < 0
      ? `<span class="chip down">↓ ${Math.abs(pct)}%</span>`
      : delta > 0
      ? `<span class="chip up">↑ ${pct}%</span>`
      : `<span class="chip stable">Stable</span>`;
    return `<div class="competitor-row"><span>${comp.hotelName} <small style="color:#718096">moy. €${avg}</small></span>${chip}</div>`;
  }).join('');

  const competitorAvgPrice = (() => {
    const latestPrices = competitors.map((comp) => {
      const records = priceHistory.filter((r) => r.competitorId === comp.competitorId);
      if (!records.length) return null;
      return records.sort((a, b) => new Date(b.scrapedAt) - new Date(a.scrapedAt))[0].price;
    }).filter(Boolean);
    if (!latestPrices.length) return '—';
    return Math.round(latestPrices.reduce((s, p) => s + p, 0) / latestPrices.length);
  })();

  const weekendForecast = competitors.length
    ? `Sur la base des tendances actuelles, la moyenne des prix concurrents est de €${competitorAvgPrice}/nuit. Surveillez les variations ce week-end.`
    : 'Ajoutez des concurrents pour obtenir des prévisions week-end.';

  return {
    yourAvgPrice,
    competitorAvgPrice,
    positionRank: '—',
    alertCount,
    competitorRows,
    weekendForecast,
  };
}

module.exports = {
  sendPriceDropAlert,
  sendWeeklyReport,
  sendWelcomeEmail,
};
