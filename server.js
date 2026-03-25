require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Config ───────────────────────────────────────────────
const ROOBET_TOKEN = process.env.ROOBET_BEARER_TOKEN;
const ROOBET_USER_ID = process.env.ROOBET_USER_ID;
const ROOBET_API_KEY = process.env.ROOBET_API_KEY;
const ROOBET_STATS_URL = 'https://roobetconnect.com/affiliate/v2/stats';

// Prize distribution for top 10 ($2,500 total)
const PRIZES = [750, 500, 325, 225, 175, 150, 125, 100, 85, 65];

// ─── Middleware ───────────────────────────────────────────
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Helpers ─────────────────────────────────────────────

function maskUsername(username) {
  if (!username || username.length <= 2) return '***';
  const first = username.substring(0, 2);
  const last = username.substring(username.length - 1);
  const stars = '*'.repeat(Math.min(username.length - 3, 6));
  return first + stars + last;
}

function getMonthStartISO() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function getNowISO() {
  return new Date().toISOString();
}

function getEndOfMonthISO() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

// ─── In-memory cache ─────────────────────────────────────
let leaderboardCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

// ─── Core fetch function ─────────────────────────────────

async function fetchFromRoobet(includeCategories) {
  const params = new URLSearchParams();
  params.set('userId', ROOBET_USER_ID);
  params.set('startDate', getMonthStartISO());
  params.set('endDate', getNowISO());
  params.set('sortBy', 'wagered');

  if (includeCategories) {
    params.set('categories', 'slots,provably fair');
  }

  const url = `${ROOBET_STATS_URL}?${params.toString()}`;
  console.log(`[Roobet] Fetching: ${url.replace(ROOBET_USER_ID, 'REDACTED')}`);

  const headers = {
    'Authorization': `Bearer ${ROOBET_TOKEN}`,
    'Content-Type': 'application/json'
  };

  // Include API key if available
  if (ROOBET_API_KEY) {
    headers['x-api-key'] = ROOBET_API_KEY;
  }

  const response = await fetch(url, { method: 'GET', headers });
  const status = response.status;
  console.log(`[Roobet] Status: ${status}`);

  if (!response.ok) {
    const body = await response.text();
    console.error(`[Roobet] Error body: ${body}`);
    return { ok: false, status, body };
  }

  const data = await response.json();
  console.log(`[Roobet] Got ${Array.isArray(data) ? data.length : 0} users`);
  return { ok: true, data };
}

function processAndRespond(data, res) {
  const sorted = Array.isArray(data)
    ? data.sort((a, b) => (b.weightedWagered || 0) - (a.weightedWagered || 0))
    : [];

  const top10 = sorted.slice(0, 10).map((user, index) => ({
    rank: index + 1,
    username: maskUsername(user.username),
    wagered: Math.round((user.weightedWagered || 0) * 100) / 100,
    prize: PRIZES[index] || 0,
    rankLevel: user.rankLevel || 0,
    rankLevelImage: user.rankLevelImage || null
  }));

  const result = {
    leaderboard: top10,
    totalPrizePool: 2500,
    updatedAt: new Date().toISOString(),
    monthStart: getMonthStartISO(),
    monthEnd: getEndOfMonthISO(),
    totalParticipants: sorted.length
  };

  leaderboardCache = result;
  lastFetchTime = Date.now();

  return res.json(result);
}

// ─── Routes ──────────────────────────────────────────────

app.get('/api/leaderboard', async (req, res) => {
  try {
    const now = Date.now();

    if (leaderboardCache && (now - lastFetchTime) < CACHE_TTL) {
      return res.json(leaderboardCache);
    }

    // Try with categories first
    let result = await fetchFromRoobet(true);

    // If 404 with categories, retry without (category names may differ)
    if (!result.ok && result.status === 404) {
      console.log('[Leaderboard] Retrying without categories...');
      result = await fetchFromRoobet(false);
    }

    if (!result.ok) {
      if (leaderboardCache) {
        return res.json({ ...leaderboardCache, stale: true });
      }
      return res.status(502).json({
        error: 'Failed to fetch leaderboard data',
        status: result.status,
        details: result.body
      });
    }

    return processAndRespond(result.data, res);

  } catch (err) {
    console.error('[Leaderboard] Error:', err.message);
    if (leaderboardCache) {
      return res.json({ ...leaderboardCache, stale: true });
    }
    return res.status(500).json({ error: err.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    cached: !!leaderboardCache,
    cacheAge: leaderboardCache ? Math.round((Date.now() - lastFetchTime) / 1000) + 's' : null,
    config: {
      userId: ROOBET_USER_ID ? 'set' : 'MISSING',
      token: ROOBET_TOKEN ? 'set' : 'MISSING',
      apiKey: ROOBET_API_KEY ? 'set' : 'MISSING'
    }
  });
});

// Debug endpoint — shows raw API response. REMOVE IN PRODUCTION!
app.get('/api/debug', async (req, res) => {
  try {
    // Minimal request — just userId + sortBy
    const url = `${ROOBET_STATS_URL}?userId=${encodeURIComponent(ROOBET_USER_ID)}&sortBy=wagered`;
    console.log(`[Debug] ${url}`);

    const headers = {
      'Authorization': `Bearer ${ROOBET_TOKEN}`,
      'Content-Type': 'application/json'
    };
    if (ROOBET_API_KEY) headers['x-api-key'] = ROOBET_API_KEY;

    const response = await fetch(url, { method: 'GET', headers });
    const body = await response.text();

    res.json({
      requestUrl: url.replace(ROOBET_USER_ID, 'REDACTED'),
      status: response.status,
      statusText: response.statusText,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      body: body.substring(0, 2000)
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`\n🎰 MysticBert Leaderboard running on port ${PORT}`);
  console.log(`   User ID: ${ROOBET_USER_ID || 'MISSING!'}`);
  console.log(`   Token:   ${ROOBET_TOKEN ? '✅' : '❌ MISSING!'}`);
  console.log(`   API Key: ${ROOBET_API_KEY ? '✅' : '❌ MISSING!'}`);
  console.log(`\n   🔧 Debug: http://localhost:${PORT}/api/debug`);
  console.log(`   ❤️  Health: http://localhost:${PORT}/api/health\n`);
});
