# XenoAI – Marketing Copilot

An AI-native Mini CRM for D2C brands to reach shoppers intelligently.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Next.js Frontend (Vercel)                              │
│  Dashboard · Customers · Segments · Campaigns · Copilot │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API
┌─────────────────────▼───────────────────────────────────┐
│  CRM Service (Render)  :4000                            │
│  Express · Drizzle ORM · Gemini AI · BullMQ             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ │
│  │Customers │ │Segments  │ │Campaigns │ │AI Copilot │ │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘ │
└──────────┬──────────────────────────┬────────────────────┘
           │ dispatch via BullMQ      │ receipt callbacks
┌──────────▼──────────────────────────▼────────────────────┐
│  Channel Service (Render)  :4001                         │
│  Simulates sent→delivered→opened→read→clicked→failed     │
│  BullMQ workers fire delayed callbacks to CRM            │
└──────────────────────────────────────────────────────────┘
           │                          │
    ┌──────▼──────┐           ┌───────▼──────┐
    │ PostgreSQL   │           │    Redis      │
    │ (Supabase)  │           │  (Upstash)   │
    └─────────────┘           └──────────────┘
```

## Local Development

### Prerequisites
- Node.js 18+
- Docker (for Postgres + Redis)

### Setup

```bash
# 1. Clone and install
git clone <your-repo>
cd xenoai
npm install          # installs all workspace deps

# 2. Start infrastructure
docker compose up -d  # starts postgres:5432 + redis:6379

# 3. Configure environment
# apps/crm/.env — fill in GEMINI_API_KEY
# (everything else defaults to localhost)

# 4. Start services (3 terminals)
cd apps/crm     && npm run dev   # CRM on :4000
cd apps/channel && npm run dev   # Channel on :4001
cd apps/web     && npm run dev   # Frontend on :3000

# 5. Open http://localhost:3000
#    Click "Import Sample Data" on the dashboard
```

### Environment Variables

**apps/crm/.env**
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/xenoai
REDIS_URL=redis://localhost:6379
CHANNEL_SERVICE_URL=http://localhost:4001
CRM_CALLBACK_URL=http://localhost:4000/api/receipt/event
GEMINI_API_KEY=your-gemini-api-key
PORT=4000
```

**apps/channel/.env**
```
REDIS_URL=redis://localhost:6379
PORT=4001
```

**apps/web/.env.local**
```
NEXT_PUBLIC_CRM_URL=http://localhost:4000
```

## Deployment

### 1. Database — Supabase (free tier)
1. Go to [supabase.com](https://supabase.com) → New project
2. Copy the **Connection string** (Settings → Database → URI)
3. Use as `DATABASE_URL` in Render env vars

### 2. Redis — Upstash (free tier)
1. Go to [upstash.com](https://upstash.com) → New Redis database
2. Copy the **Redis URL**
3. Use as `REDIS_URL` in both CRM and Channel service env vars

### 3. Backend — Render

**CRM Service:**
1. New Web Service → connect GitHub → select `apps/crm` root
2. Build: `npm install && npm run build`
3. Start: `npm start`
4. Environment variables:
   - `DATABASE_URL` — Supabase connection string
   - `REDIS_URL` — Upstash Redis URL
   - `GEMINI_API_KEY` — from [aistudio.google.com](https://aistudio.google.com)
   - `CHANNEL_SERVICE_URL` — URL of the Channel service (add after deploying it)
   - `CRM_CALLBACK_URL` — `https://<crm-url>/api/receipt/event`

**Channel Service:**
1. New Web Service → same repo → root dir: `apps/channel`
2. Build: `npm install && npm run build`
3. Start: `npm start`
4. Environment variables:
   - `REDIS_URL` — same Upstash URL

### 4. Frontend — Vercel
1. Import GitHub repo at [vercel.com](https://vercel.com)
2. Set root directory to `apps/web`
3. Environment variable:
   - `NEXT_PUBLIC_CRM_URL` — `https://<crm-service-url>`
4. Deploy

## Features

### AI Segment Builder
Describe your audience in plain English:
> "Find customers who spent over ₹5000 and haven't purchased in 90 days"

AI converts it to structured filter rules and evaluates them against your database instantly.

### AI Campaign Creator
Type a goal:
> "Win back inactive shoppers with a discount offer"

AI generates campaign name, channel recommendation, and a personalized message.

### AI Copilot
Full chat interface that takes real actions:
- Creates segments in the database
- Surfaces top customers with live data
- Gives dashboard stats
- Suggests next steps

### Two-Service Callback Architecture
- CRM dispatches sends → **BullMQ queue** → Channel Service
- Channel Service simulates realistic delivery lifecycle with per-channel probabilities
- Each event (sent/delivered/opened/read/clicked/failed) fires as a **delayed BullMQ job**
- Channel Service POSTs callbacks back to CRM receipt endpoint
- CRM ingests callbacks, updates communication status, increments analytics counters atomically
- Campaign auto-completes when all sends are resolved

### Delivery Probabilities
| Channel   | Delivery | Open | Read | Click |
|-----------|----------|------|------|-------|
| EMAIL     | 90%      | 32%  | 24%  | 8%   |
| SMS       | 96%      | 72%  | 65%  | 15%  |
| WHATSAPP  | 98%      | 80%  | 72%  | 20%  |

## Project Structure

```
xenoai/
├── apps/
│   ├── crm/           # CRM Service — Express + Drizzle + Gemini
│   │   ├── src/
│   │   │   ├── api/   # customers, orders, segments, campaigns, analytics, receipt, ai
│   │   │   ├── db/    # schema.ts, index.ts, migrate.ts
│   │   │   ├── lib/   # ai.ts, queue.ts, segment-eval.ts
│   │   │   ├── workers/
│   │   │   └── seed.ts
│   │   └── prisma/schema.prisma  (reference — actual ORM is Drizzle)
│   ├── channel/       # Channel Service — Express + BullMQ
│   │   └── src/
│   │       ├── api/send/
│   │       ├── simulator/lifecycle.ts
│   │       └── workers/eventWorker.ts
│   └── web/           # Next.js Frontend
│       ├── app/       # dashboard, customers, segments, campaigns, copilot
│       ├── components/# ui, layout, copilot
│       └── lib/api.ts
├── docker-compose.yml
└── README.md
```

## System Design Notes

**Scalability assumptions (current):**
- ~10k customers, ~100k orders, campaigns to ~2k recipients
- Single Postgres instance, single Redis, single worker process per service

**At Xeno-scale:**
- Replace BullMQ+Upstash with SQS + Lambda workers (auto-scales)
- Materialize segment memberships in `segment_members` table (nightly cron)
- Shard `communications` by `campaign_date`
- Add dead-letter queue + alerting for failed callbacks
- Event ordering guarantee: only advance status forward (already implemented)
- Idempotent receipt: duplicate callbacks are no-ops

**Callback ordering:**
Status transitions are forward-only: `QUEUED→SENT→DELIVERED→OPENED→READ→CLICKED`.
A `clicked` callback arriving before `delivered` (network delay) only advances to `CLICKED` on the next valid transition.
