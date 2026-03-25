# MysticBert — Roobet Wager Leaderboard

A live wager leaderboard website for MysticBert's Roobet affiliate program.

## Features
- **Live data** from Roobet's Affiliate Stats API (updates every 15 min)
- **Secure backend proxy** — API tokens never exposed to the browser
- **Username masking** — Roobet requirement (e.g., "MrRoobet" → "Mr****t")
- **RTP-weighted wagers** — uses `weightedWagered` from the API
- **Auto-refresh** — frontend polls every 5 minutes
- **Countdown timer** — shows time until month reset
- **$2,500 prize pool** split across top 10

## Prize Distribution
| Rank | Prize |
|------|-------|
| 1st  | $750  |
| 2nd  | $500  |
| 3rd  | $325  |
| 4th  | $225  |
| 5th  | $175  |
| 6th  | $150  |
| 7th  | $125  |
| 8th  | $100  |
| 9th  | $85   |
| 10th | $65   |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure your .env file (already pre-filled, but verify)
cat .env

# 3. Start the server
npm start

# 4. Visit http://localhost:3000
```

## Deployment Options

### Option A: Railway (Easiest)
1. Push to GitHub (make sure `.env` is in `.gitignore`)
2. Connect repo to [railway.app](https://railway.app)
3. Add environment variables in Railway dashboard:
   - `ROOBET_BEARER_TOKEN`
   - `ROOBET_USER_ID`
   - `ROOBET_API_KEY`
   - `PORT` (Railway sets this automatically)
4. Deploy — done!

### Option B: VPS (DigitalOcean, etc.)
```bash
# SSH into your server
git clone <your-repo>
cd mysticbert-leaderboard
npm install
# Set up .env with your credentials
# Use PM2 to keep it running:
npm install -g pm2
pm2 start server.js --name mysticbert
pm2 save
pm2 startup
```

### Option C: Render
1. Push to GitHub
2. Create new Web Service on [render.com](https://render.com)
3. Set environment variables in Render dashboard
4. Build command: `npm install`
5. Start command: `npm start`

## API Endpoints

### `GET /api/leaderboard`
Returns the current month's top 10 leaderboard.

**Response:**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "username": "Mr****t",
      "wagered": 49319.44,
      "prize": 750,
      "rankLevel": 1,
      "rankLevelImage": "https://..."
    }
  ],
  "totalPrizePool": 2500,
  "updatedAt": "2026-03-25T12:00:00.000Z",
  "monthStart": "2026-03-01T00:00:00.000Z",
  "monthEnd": "2026-04-01T00:00:00.000Z",
  "totalParticipants": 42
}
```

### `GET /api/health`
Health check endpoint.

## Roobet Compliance
This leaderboard follows all Roobet requirements:
- ✅ Usernames are masked/blurred
- ✅ Only Slots and Provably Fair (house games, no dice) count
- ✅ Weighted wagers used (RTP ≤97% = 100%, >97% = 50%, ≥98% = 10%)
- ✅ Required disclosure text included on the page

## Security Notes
- **NEVER** commit `.env` to git
- The Bearer token is only used server-side
- Consider rotating your API token periodically
- CORS is enabled but can be restricted to your domain in production

## Tech Stack
- **Backend:** Node.js + Express
- **Frontend:** Vanilla HTML/CSS/JS (no framework needed)
- **API:** Roobet Affiliate Stats v2

## Social Links
- **Kick:** [kick.com/mysticbert](https://kick.com/mysticbert)
- **Discord:** [discord.gg/SJNhcW4cWg](https://discord.gg/SJNhcW4cWg)
- **X:** [x.com/mysticbert](https://x.com/mysticbert)
- **Roobet Code:** MYSTICBERT
