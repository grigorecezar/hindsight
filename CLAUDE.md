@AGENTS.md

# Hindsight. Working Agreements

Hindsight scores stock calls (an author's rating on a company, from a source
like Seeking Alpha) against what the stock did next, ranks the authors, and
blends their latest calls into a consensus. One Next.js app on Railway: the
UI, the API routes and the jobs share one codebase. Keep this file short.
Add rules as we learn them.

## Project layout

- `src/app/` pages, server actions (`actions.ts`), API routes (`api/`).
- `src/components/` UI. `ui/` is the primitives, the rest is by feature.
- `src/server/` everything server side, never imported by client code except
  enums, constants and pure utils.
  - `modules/<module>/` one folder per domain: `companies`, `sources`,
    `calls`, `prices`, `outcomes`, `analytics`, `runs`.
  - `services.ts` is the composition root. Every service is built there.
  - `db/schema/` one table or enum per file. `config/`, `errors/`,
    `logging/`, `common/utils/` are shared.
- `scripts/` command line entry points (`job.ts`, `migrate.ts`).
- `extension/` the Chrome extension that syncs Seeking Alpha from the user's
  own logged in session. Plain JavaScript, Manifest V3, no build step.
- `drizzle/` generated migrations. `tests/` vitest.

## Domain naming (one concept, one name)

Use these words identically in code, the database, the UI and docs. Before
naming something, check what the codebase already calls it.

- **company**: a ticker on the watchlist. Archived, never deleted.
- **source**: a third party that publishes calls (Seeking Alpha). Never
  "provider" or "party" in code. Prices come from a **market data provider**,
  which is a different thing.
- **author**: the person behind a call, per source.
- **call**: one author's rating on one company at one moment, from one source.
  For Seeking Alpha a call is an article's rating. Never "recommendation",
  "signal" or "article rating".
- **rating**: the five step verdict, `STRONG_SELL` to `STRONG_BUY`. Seeking
  Alpha calls it a sentiment; only the adapter says that word.
- **entry**: the first close a reader could have traded on a call.
- **horizon**: 1, 2, 3, 6 or 12 months after the entry.
- **outcome**: what the stock did over one horizon after one call. Exists
  only once the horizon has passed.
- **excess return**: stock return minus the benchmark's (SPY) over the same
  days. **hit**: the call was right at that horizon.
- **edge**, **skill**, **weight**: an author's average excess return in the
  direction of their calls, that edge shrunk for small samples, and the
  multiplier it earns in the consensus.
- **consensus**: the blended rating per company. A **snapshot** is the
  consensus as it stood on one day, computed only from what was known then.
- **run**: one execution of the job pipeline.
- **sync**: reading new calls from a source. A **browser sync** is the
  extension pushing Seeking Alpha pages in. A **sync window** is the stretch
  of time a sync reads for one company.

## Writing and copy (UI text)

1. **Never use dashes in copy. Use periods.** No em dashes, no en dashes, no
   " - " between clauses. Number ranges are "3 to 8". Hyphens inside real
   compound words are fine. A minus sign in a number is not a dash.
2. **Plain words.** Copy sounds like a smart friend talking.
3. **Dates spell the month**: "October 17, 2026" in prose, "Oct 17, 2026" in
   dense tables. Never numeric, never ISO, in the UI.
4. **Curly apostrophes** in prose (`&rsquo;` or ’), like the personal site.

## Code structure

- **Descriptive names, always.** `company`, never `c`. A loop index `i` and
  `err` are the only short names. Name an injected dependency after its type:
  `callsService: CallsService`.
- **Booleans are assertions**: `isHit`, `hasRange`, `canRetry`.
- **Prefer a nullable timestamp over a boolean when the moment matters**:
  `archivedAt`, `backfilledAt`, `finishedAt`.
- **Services are classes**, one cohesive job each, under about 500 lines.
  Spell out `public`; default to `private`. A class keeps its constants as
  `private static readonly` members. A function util or component may keep a
  non-exported const beside it.
- **One type, enum or exported util per file**, filed by kind: `services/`,
  `types/`, `enums/`, `utils/`, `constants/`, `errors/`. Nothing loose at a
  module root except its `<MODULE>-README.md`.
- **A module README only where the code cannot speak for itself**
  (`sources/SOURCES-README.md`). It holds the why and how to run things.
- **Always brace control blocks. No `else`, no `if` inside an `if`.** Return
  early; extract a private method. Enforced by ESLint (`curly`,
  `no-else-return`).
- **Group a method into commented paragraphs**: one short comment per real
  step, never per line.
- **Enums are UPPER_CASE keys and values.** Change a Postgres enum by adding
  to it, never by rebuilding the type.

## Errors

- Never throw a bare `new Error()`. Throw a `BaseError` subclass from
  `src/server/errors/` with fields for the logs.
- A failure the user can act on is a `DomainError`. Its message is product
  copy and is shown as is. Anything else reaches the UI as a generic message.

## Logging

- pino via `createLogger(ClassName.name)`. A log line is a short stable event
  name plus fields: `logger.info({ ticker, count }, 'calls saved')`. Never
  interpolate data into the message.
- Log in the service layer, once, after a state change or an external call.
  Not in repositories, not on reads.
- Jobs bracket themselves (`run started`, `run finished`, `run failed`).
  `error` is only for real bugs, from the one place that owns them.
- Never log a secret (the RapidAPI key is redacted as a backstop).

## State and concurrency

- No coordination state in process. Two processes run this code (web and
  cron). The one-run-at-a-time rule is a Postgres advisory lock (`JobLock`).
- Fine in process: a lazy cache of something reconstructible (the db pool,
  the services), and a per-run pacing counter inside the lock.

## Database

- **Never hand-write migrations.** Change `src/server/db/schema/`, run
  `npm run db:generate`, read the SQL, commit it. Railway applies it before
  each deploy (`npm run db:migrate`).
- Model a foreign key as a real reference with a deliberate `onDelete`:
  `cascade` for rows meaningless without the parent, `set null` otherwise.
- `source` is text, not a Postgres enum, so adding a source needs no
  migration.
- Columns are snake_case in Postgres and camelCase in TypeScript
  (`casing: 'snake_case'`). Raw SQL uses the snake_case names.

## Next.js 16 (read `node_modules/next/dist/docs/` first)

- Middleware is `src/proxy.ts`. It does basic auth when `APP_PASSWORD` is set.
- Cache Components is on. Every component that reads the database sits inside
  `<Suspense>` and calls `await connection()` first, so the build never
  touches the database (Railway's private network does not exist at build
  time). Client hooks that read the URL also need a Suspense boundary.
- Mutations are server actions in `src/app/actions.ts`. Long work goes in
  `after()`, and the action calls `refresh()`.

## Design

The look of cezargrigore.com: ink on a warm bone ground, Fraunces for the
wordmark, headings and prose, the system sans for data. Data sits on paper
planes (`<Plane>`, `<Table>`).

- **Tokens** live in `src/app/globals.css`: `ink`, `bone`, `paper`, and the
  five rating colors.
- **Text has four tiers, never a fifth**: `text-ink` (primary), `text-ink/75`
  (secondary), `text-ink/65` (muted, 5.2:1 on bone), `text-ink/40` (faint:
  placeholders, empty cells, separators only).
- **Ratings never rely on color alone.** Blue for bullish, red for bearish, a
  warm gray hold; always with a label and an up, down or round mark. The
  palette passes the dataviz validator on paper. Re-run it
  (`validate_palette.js --pairs all --surface #f7f3ec`) before changing a
  rating color.
- **Text wears ink, never a rating color.** Values and labels stay in the
  text tiers; the mark beside them carries the rating.
- **No horizontal page scroll at 390px.** Wide tables scroll inside their
  plane. A grid holding a table needs `grid-cols-1` (a `minmax(0, 1fr)`
  track) so the table cannot stretch the page.
- Empty values show the faint `·` (`<Empty>`, `<Num>`), never a dash.

## Code formatting

Prettier owns formatting (`.prettierrc`): no semicolons, single quotes,
trailing commas, 80 columns. `npm run lint` checks ESLint and Prettier;
`npm run format` fixes. `npm run typecheck` and `npm test` before a commit.
