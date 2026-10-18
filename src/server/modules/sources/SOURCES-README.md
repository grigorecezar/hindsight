# Sources

A source is a third party that publishes calls: an author's rating on a
company at a moment in time. Seeking Alpha is the first. Everything past this
folder (storage, prices, outcomes, track records, the consensus) only ever
sees our own `SourceCall` shape, so a new source is one adapter and one line
of wiring.

## Adding a source

1. Add its id to `enums/SourceId.ts` (UPPER_CASE). The `source` column is
   text, so no migration is needed.
2. Create a folder for it next to `seeking-alpha/` with a class implementing
   `types/Source.ts`:
   - `isConfigured()` returns false when its credentials are missing. Runs
     then skip it instead of failing.
   - `fetchCalls({ ticker, since })` returns every call on that ticker
     published at or after `since`, translated into our five ratings. Return
     `requestCount` so runs can show what a sync cost.
3. Register it in `src/server/services.ts` (`new SourceRegistry([...])`) and
   add its settings to `src/server/config/configSchema.ts`.

Calls are unique per (source, external id, company), and authors per
(source, external id). The same person on two sources is two authors, on
purpose: their track records are earned separately.

Ratings that are not five steps map onto ours. A source with only bullish,
neutral and bearish uses BUY, HOLD and SELL. A price target with no rating can
be turned into one (target above the price by more than the hold band is a
BUY), but write that rule down in the adapter's docblock.

## Seeking Alpha (pushed, not pulled)

Seeking Alpha is not a `Source` in the registry. Its author ratings are
Premium data and the site blocks scrapers: RapidAPI resellers return the
ratings stripped (`sentiment` objects with empty attributes, or
`is_locked: true`), and Apify scrapers get a 403 from the bot protection.
Both were tested in October 2026.

So the ratings are read from your own logged in browser by the extension in
`extension/` (see `extension/README.md`), and pushed in:

- `seeking-alpha/services/BrowserSyncService.ts` is the server half: the
  plan (which companies, which windows), storing pages, and marking a window
  read once its last page is in.
- `seeking-alpha/utils/parseAnalysisPage.ts` and `SeekingAlphaDocument.ts`
  read Seeking Alpha's JSON:API feed. A rating is an included `sentiment`
  (`very_bullish` to `very_bearish`), linked by `articleId` or through the
  article's `sentiments` relationship. Only articles where the company is a
  primary ticker become calls. A sentiment that is referenced but has no
  `type` is counted as locked, and a page that is all locked stops the sync.

Sync windows (`calls/utils/syncWindows.ts`) work the same for pushed and
pulled sources: the whole history the first time, then from the newest call
less a 2 week overlap, plus any older stretch still missing after
`BACKFILL_DAYS` grows.
