# Hindsight Sync (Chrome extension)

Seeking Alpha only shows author ratings to logged in Premium readers, and it
blocks scrapers. So Hindsight reads them the way you would: from your own
browser, logged in as you, only when you click **Sync**.

## Install (once)

1. Open `chrome://extensions` and turn on **Developer mode** (top right).
2. Click **Load unpacked** and pick this `extension/` folder.
3. Pin **Hindsight Sync** to the toolbar.

Running Hindsight locally (`npm run dev`, http://localhost:3000) needs no
settings. For a deployed Hindsight, open the popup's **Settings**, enter its
address and the `SYNC_TOKEN` you set on the server, and save. Chrome asks
for permission to reach that address.

## Sync

1. Log in to Seeking Alpha in Chrome. Leave a seekingalpha.com tab open (the
   extension opens one in the background if there is none).
2. Click the extension, then **Sync**.

What happens:

- Hindsight sends the list of companies and, for each, how far back to read.
  The first time, that is the last `BACKFILL_DAYS` (6 months while we test,
  3 years later). After that, only from the newest stored call, less a 2
  week overlap to catch edits.
- For each company the extension uses the site like you would: types the
  ticker into the search box, clicks the result, opens the **Analysis** tab,
  and scrolls down the list in uneven steps with pauses. It never opens an
  article.
- From each row it reads the title, the rating badge (Strong Buy to Strong
  Sell), the author and the date, and sends the rows to Hindsight. Rows
  without a badge are skipped. It stops scrolling once the rows are older
  than what Hindsight needs.
- The list shows dates without a time, so a call is timed at 4pm New York
  that day. Its entry is then the next trading day's close, which never
  credits a call with a move nobody could have acted on.
- When it finishes, Hindsight rescores everything. The sync shows on the
  Runs page as a Browser sync.

The Seeking Alpha tab comes to the front while it runs, because Chrome loads
no new rows in a tab you cannot see. Keep it on screen until the popup says
Done. Working in another app or window beside it is fine. If the tab does go
into the background, the sync pauses ("Bring the Seeking Alpha tab back to
the front") and carries on when it is visible again.

Raising `BACKFILL_DAYS` later (say to 1095 for 3 years) makes the next sync
read only the older stretch that is missing.

## When it stops

It stops instead of retrying, and says why:

- **Seeking Alpha wants to check you are human**: open the tab, complete the
  check, and try again later.
- **Logged out**, or **ratings hidden** (logged in without Premium): log in
  with Premium and sync again.
- **Stopped after 400 scrolls**: a safety cap per sync. Click Sync again to
  continue.
- **Could not read the list or its dates**: Seeking Alpha changed the page.
  Tell Claude what the page looks like now.

Nothing is lost when it stops. A window only counts as read once its last
page is in, so the next sync carries on.

## Go easy on your account

Automated reading is against Seeking Alpha's terms, and they can restrict
accounts that do it. The extension keeps a low profile: it only runs when you
click, pages slowly, reads only what is new, and stops on the first sign of
trouble. A 6 month first sync for a handful of companies is a few dozen
scrolls. Start with one or two companies and check the Runs page before adding
many.
