# Hindsight

What the analysts said, and what the stock did next.

Hindsight pulls every rated Seeking Alpha article on the companies you follow,
records the rating (Strong Sell to Strong Buy) and the price a reader could
have acted on, then measures what the stock did over the next 1, 2, 3, 6 and
12 months against the S&P 500. From that it shows:

- **Accuracy by rating**: hit rate and average excess return for each rating
  and horizon, overall and per company.
- **Timing and swing**: how often a call moved 10% its way (or against it)
  within each horizon, the typical wait, and the best and worst point along
  the way.
- **An author leaderboard**: each author's edge, shrunk for small samples,
  and the weight it earns them.
- **A consensus per company**: each author's latest call, weighted by recency
  and track record, with the returns that blend has historically implied.
- **The model's own track record**: the consensus is rebuilt for every past
  month end from what was known that day, then scored like a call.

Ratings come from your own Seeking Alpha Premium session, through a small
Chrome extension that only runs when you click **Sync**. The first sync pulls
history (`BACKFILL_DAYS`), so the scores are useful immediately; after that
each sync reads only what is new. A daily cron rescores everything as prices
move and horizons mature.

## How it is built

One Next.js 16 app (UI, API routes, server actions) plus the same code run as
a command for the cron. Postgres through Drizzle. Prices from Yahoo Finance
(free, keyless). Calls from Seeking Alpha through the Chrome extension in
`extension/`, which reads Seeking Alpha's feed inside your logged in tab and
posts each page to `/api/sync`.

```
src/server/modules/
  sources/     where calls come from (Seeking Alpha today; see SOURCES-README.md)
  calls/       storing calls and syncing them per company
  prices/      daily closes (Yahoo) and price series lookups
  outcomes/    scoring each call over each horizon
  analytics/   accuracy grid, author track records, consensus, snapshots
  companies/   the watchlist
  runs/        the job pipeline, its lock and its history
```

The pipeline (`JobRunner`): refresh prices, recompute every outcome, rebuild
every consensus snapshot, after pulling from any configured pull source. One
run at a time across all processes, through a Postgres advisory lock.

Adding another source (TipRanks, sell side ratings, anything with dated
ratings) is one adapter implementing `Source`. See
`src/server/modules/sources/SOURCES-README.md`.

## Where the ratings come from

Seeking Alpha shows author ratings only to logged in Premium readers, and it
blocks scrapers. RapidAPI resellers return the ratings stripped, and Apify
scrapers get blocked (both tested). So Hindsight reads them from your own
browser session with the extension in `extension/`. Install and use:
[`extension/README.md`](extension/README.md).

The server side is `BrowserSyncService`: `GET /api/sync/plan` says which
companies and time windows to read, `POST /api/sync/pages` stores each raw
feed page (parsed by the Seeking Alpha parser), and `POST /api/sync/complete`
records the sync on the Runs page and rescores. Each company's sync state
remembers how far back its history is covered and the newest call, so a sync
never reads the same stretch twice.

## Running locally

Needs Node 22.9 or later and Postgres.

```bash
cp .env.example .env          # set DATABASE_URL
npm run db:up                 # local Postgres in Docker on port 5438 (optional)
npm install
npm run db:migrate
npm run dev                   # http://localhost:3000
```

Add companies on the home page (or `npm run job -- add AAPL MSFT`), then
click **Sync** in the extension.

```bash

```

Rescoring from the command line:

```bash
npm run job -- refresh    # rescore from stored data
npm run job -- auto       # what the cron runs
```

Checks: `npm run lint`, `npm run typecheck`, `npm test`.

## Deploying to Railway

One Railway project, one GitHub repo, three pieces:

1. **Postgres.** Add a Postgres database.
2. **Web service.** New service from this repo. It reads `railway.json`:
   migrations run before each deploy, then `npm run start`, with a health check
   on `/api/health`. Set variables:
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`
   - `APP_PASSWORD` (basic auth for the whole app, any username)
   - `SYNC_TOKEN` (any long random string; paste it in the extension's
     settings along with the app's address)
   - Generate a public domain under Settings, Networking.
3. **Cron service.** Another service from the same repo. Under Settings, set
   the config file path to `/railway.cron.json`. It runs
   `npm run job -- auto --cron` every day at 06:00 UTC and exits. Give it the
   same `DATABASE_URL`.

`auto` rescores weekly and monthly (refreshing prices and maturing outcomes),
and would also pull from any server side source added later. Seeking Alpha
calls only ever come in through the extension.

If you would rather not run a cron service, any scheduler can `POST
/api/runs` with `Authorization: Bearer $CRON_SECRET` (set `CRON_SECRET` on
the web service). The body `{"kind":"AUTO"}` is the default.

## Settings

All optional except `DATABASE_URL`. See `.env.example`.

| Variable           | Default | What it does                                       |
| ------------------ | ------- | -------------------------------------------------- |
| `DATABASE_URL`     |         | Postgres connection                                |
| `SYNC_TOKEN`       |         | Token the extension sends to a deployed app        |
| `APP_PASSWORD`     |         | Basic auth for the app                             |
| `CRON_SECRET`      |         | Enables `POST /api/runs`                           |
| `BACKFILL_DAYS`    | 1095    | How far back each company's history reaches        |
| `RESYNC_DAYS`      | 90      | How far back the monthly resync re-reads           |
| `BENCHMARK_TICKER` | SPY     | What excess return is measured against             |
| `TARGET_MOVE`      | 0.1     | The move that counts as a call reaching its target |

## How calls are scored

- **Entry**: the close of the publish day if the article went out before 4pm
  New York time, otherwise the next trading day. No credit for moves nobody
  could act on.
- **Returns** use adjusted closes, so splits and dividends are not moves.
  "Price at call" shows the actual close.
- **Hit**: a buy beat the S&P over the horizon, a sell lagged it, a hold
  stayed within a band (5% at one month, widening with the square root of
  time).
- **Edge**: an author's average excess return in the direction of their calls
  at 3 months, shrunk toward zero as if they had made 10 more calls with no
  edge. Weight is `1 + 10 × skill`, kept between 0.25 and 3.
- **Consensus**: each author's latest call from the last 180 days, weight
  halving every 60 days, times the author's weight. Expected returns are what
  calls of each rating did in the past, pulled toward the market when there
  are few of them.

The model's knobs are named constants in `TrackRecordModel`, `ConsensusModel`
and `OutcomePriors` (`src/server/modules/analytics/utils/`).

Not investment advice.
