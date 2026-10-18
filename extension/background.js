// Hindsight Sync: the sync loop. Runs only when the popup asks.
//
// It uses Seeking Alpha the way you would. For each company Hindsight asks
// about (/api/sync/plan), it types the ticker into Seeking Alpha's search
// box, clicks the result, opens the Analysis tab, and scrolls down the list
// at a human pace. From each row it reads the title, rating badge, author
// and date (it never opens an article) and hands the rows to Hindsight
// (/api/sync/items). It stops scrolling once the rows are older than what
// Hindsight already has, so each sync reads only what is new.

const SITE = 'https://seekingalpha.com'
// Pauses, randomised so it reads like a person, not a script.
const ROUND_PAUSE_MS = [900, 2400]
const COMPANY_PAUSE_MS = [4000, 9000]
// The list is over when scrolling to the bottom loads nothing this many times.
const END_OF_LIST_ROUNDS = 3
// Hard limits, so a bug can never turn into a flood on your account.
const MAX_ROUNDS_PER_COMPANY = 80
const MAX_ROUNDS_PER_SYNC = 400
// How long a sync waits for a backgrounded Seeking Alpha tab to come back.
const MAX_HIDDEN_WAIT_MS = 10 * 60_000

const DEFAULT_SETTINGS = {
  hindsightUrl: 'http://localhost:3000',
  syncToken: '',
}

let isSyncing = false

// A worker that restarts mid sync loses its loop. Say so instead of
// showing "Syncing" forever. Nothing is lost: an unfinished company is read
// again next time.
chrome.storage.local.get('sync').then(({ sync }) => {
  if (sync?.status === 'running' && !isSyncing) {
    setState({
      status: 'error',
      message:
        'The sync was interrupted. Click Sync to carry on where it stopped.',
    })
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'sync:start') {
    return false
  }
  if (!isSyncing) {
    runSync()
  }
  sendResponse({ isStarted: true })
  return false
})

class SyncStop extends Error {}

async function runSync() {
  isSyncing = true
  const totals = {
    companyCount: 0,
    pageCount: 0,
    callsSaved: 0,
    unratedSkipped: 0,
  }
  const problems = []
  const context = { label: '' }
  await setState({
    status: 'running',
    message: 'Asking Hindsight what to read.',
    ...totals,
    startedAt: Date.now(),
  })

  try {
    const settings = await getSettings()
    const plan = await hindsight(settings, 'GET', '/api/sync/plan')
    const jobs = [
      ...plan.companies.map(companyJob),
      ...(plan.authors ?? []).map(authorJob),
    ]
    if (jobs.length === 0) {
      throw new SyncStop(
        'Nothing to sync yet. Add a company or follow an author in Hindsight first.',
      )
    }

    // The tab is brought to the front: pages only load more rows while visible.
    const tab = await seekingAlphaTab()
    for (const [index, job] of jobs.entries()) {
      context.label = job.label
      totals.companyCount = index + 1
      const progress = { index: index + 1, count: jobs.length }
      await setState({
        status: 'running',
        message: `${job.label}: opening.`,
        ...progressState(progress),
        ...totals,
      })
      await job.open(tab.id)
      await readList(settings, tab.id, job, totals, progress)
      if (index < jobs.length - 1) {
        await pause(COMPANY_PAUSE_MS)
      }
    }

    await finish(settings, totals, problems)
    const listWord = jobs.length === 1 ? 'list' : 'lists'
    await setState({
      status: 'done',
      message: `Done. ${totals.callsSaved} calls saved from ${jobs.length} ${listWord}. Scores are updating in Hindsight.`,
      ...totals,
      lastSuccessAt: Date.now(),
    })
  } catch (error) {
    const message =
      error instanceof SyncStop
        ? error.message
        : `Something went wrong: ${error.message}`
    problems.push({ ticker: context.label, message })
    await finish(await getSettings(), totals, problems).catch(() => {})
    await setState({ status: 'error', message, ...totals })
  } finally {
    isSyncing = false
  }
}

/** A watched company: its symbol's Analysis list, reached through search. */
function companyJob(company) {
  return {
    label: company.ticker,
    windows: company.windows,
    endpoint: '/api/sync/items',
    open: (tabId) => openAnalysisList(tabId, company.ticker),
    body: (items, isComplete) => ({
      ticker: company.ticker,
      windows: company.windows,
      items,
      isComplete,
    }),
  }
}

/**
 * A followed author: their own Analysis list, opened from their profile
 * link the way you would paste it. Each row names the ticker it rates.
 */
function authorJob(author) {
  const job = {
    label: author.name,
    windows: author.windows,
    endpoint: '/api/sync/author-items',
    pageName: null,
    open: async (tabId) => {
      await navigate(tabId, `${SITE}/author/${author.slug}/analysis`)
      await waitForRows(tabId, `${author.name}'s articles`)
      job.pageName = await inPage(
        tabId,
        () => document.querySelector('h1')?.textContent?.trim() || null,
        [],
      )
    },
    body: (items, isComplete) => ({
      authorSlug: author.slug,
      authorName: job.pageName,
      windows: author.windows,
      items,
      isComplete,
    }),
  }
  return job
}

function progressState(progress) {
  return { companyIndex: progress.index, companyCount: progress.count }
}

/**
 * Gets the tab onto the ticker's Analysis list like a person would: search
 * box, result, Analysis tab. If a click does not land, it goes to the
 * address directly, as if typed into the address bar.
 */
async function openAnalysisList(tabId, ticker) {
  const symbolPath = `/symbol/${ticker}`.toLowerCase()
  const analysisPath = `${symbolPath}/analysis`

  const search = await inPage(tabId, searchForTicker, [ticker])
  if (search?.isClicked) {
    await waitForUrl(tabId, (path) => path.startsWith(symbolPath))
  }

  const path = await currentPath(tabId)
  if (path.startsWith(symbolPath) && !path.startsWith(analysisPath)) {
    await pause([600, 1400])
    const analysisTab = await inPage(tabId, clickAnalysisTab, [ticker])
    if (analysisTab?.isClicked) {
      await waitForUrl(tabId, (current) => current.startsWith(analysisPath))
    }
  }

  if (!(await currentPath(tabId)).startsWith(analysisPath)) {
    await navigate(tabId, `${SITE}/symbol/${ticker.toUpperCase()}/analysis`)
  }
  await waitForRows(tabId, `the analysis list for ${ticker}`)
}

/** Waits for the first rows to render. */
async function waitForRows(tabId, what) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const page = await inPage(tabId, readListItems, [])
    if ((page?.items.length ?? 0) > 0) {
      return
    }
    await sleep(700)
  }
  throw new SyncStop(
    `Could not find ${what}. If Seeking Alpha is asking you to check you are human, finish that, then Sync again.`,
  )
}

/** Scrolls the list from the top until it passes the oldest window start. */
async function readList(settings, tabId, job, totals, progress) {
  const since = Math.min(
    ...job.windows.map((window) => new Date(window.since).getTime()),
  )
  const seen = new Set()
  let idleRounds = 0
  let isPastStart = false

  await inPage(tabId, () => window.scrollTo(0, 0), [])
  for (let round = 0; round < MAX_ROUNDS_PER_COMPANY; round++) {
    if (totals.pageCount >= MAX_ROUNDS_PER_SYNC) {
      throw new SyncStop(
        `Stopped after ${MAX_ROUNDS_PER_SYNC} scrolls to go easy on your account. Click Sync again to continue.`,
      )
    }

    // Read what is on the page and send the rows not sent yet.
    const page = await inPage(tabId, readListItems, [])
    const items = page?.items ?? []
    if (round === 0 && items.length >= 5 && page.ratedCount === 0) {
      throw new SyncStop(
        'Seeking Alpha is not showing ratings. Make sure you are logged in with Premium, then Sync again.',
      )
    }
    const fresh = items.filter((item) => !seen.has(item.articleId))
    fresh.forEach((item) => seen.add(item.articleId))
    if (fresh.length > 0) {
      const result = await hindsight(
        settings,
        'POST',
        job.endpoint,
        job.body(fresh, false),
      )
      totals.callsSaved += result.savedCount
      totals.unratedSkipped += result.unratedCount
      if (result.undatedCount === fresh.length && fresh.length >= 5) {
        throw new SyncStop(
          'Could not read the dates on the list. Seeking Alpha may have changed the page.',
        )
      }
      isPastStart =
        result.oldestPublishedAt !== null &&
        new Date(result.oldestPublishedAt).getTime() < since
    }

    await setState({
      status: 'running',
      message: `${job.label}: ${seen.size} articles read.`,
      ...progressState(progress),
      ...totals,
    })
    if (isPastStart) {
      break
    }

    // Scroll to the bottom like a person; more rows load as it goes.
    const scrolled = await inPage(tabId, scrollToLoadMore, [])
    // A hidden tab loads no rows. Wait for it rather than mistaking the
    // silence for the end of the list.
    if (scrolled?.isHidden) {
      await waitUntilVisible(tabId, job, progress, totals)
      continue
    }
    totals.pageCount += 1
    idleRounds = scrolled?.isGrown ? 0 : idleRounds + 1
    if (idleRounds >= END_OF_LIST_ROUNDS) {
      break
    }
    await pause(ROUND_PAUSE_MS)
  }

  // Read past every window start, or to the very end of the list: done.
  const isComplete = isPastStart || idleRounds >= END_OF_LIST_ROUNDS
  if (isComplete) {
    await hindsight(settings, 'POST', job.endpoint, job.body([], true))
  }
}

/** Pauses until the Seeking Alpha tab is on screen again. */
async function waitUntilVisible(tabId, job, progress, totals) {
  await setState({
    status: 'running',
    message: `${job.label}: paused. Bring the Seeking Alpha tab back to the front to carry on.`,
    ...progressState(progress),
    ...totals,
  })
  for (let waited = 0; waited < MAX_HIDDEN_WAIT_MS; waited += 2000) {
    await sleep(2000)
    const isVisible = await inPage(
      tabId,
      () => document.visibilityState === 'visible',
      [],
    )
    if (isVisible) {
      return
    }
  }
  throw new SyncStop(
    'The Seeking Alpha tab stayed in the background, so the sync stopped. Click Sync to carry on.',
  )
}

// The functions below run inside the Seeking Alpha tab. Each must be self
// contained: Chrome copies the function's source into the page.

/** Types the ticker into the site search and clicks the matching result. */
async function searchForTicker(ticker) {
  const sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds))
  const isVisible = (element) =>
    element.offsetParent !== null || element.getClientRects().length > 0
  const findInput = () =>
    [...document.querySelectorAll('input')].find(
      (input) =>
        isVisible(input) &&
        /search|symbol/i.test(
          `${input.placeholder} ${input.getAttribute('aria-label') ?? ''} ${input.name} ${input.type}`,
        ),
    )

  let input = findInput()
  if (!input) {
    const opener = [
      ...document.querySelectorAll('button, [role="button"], a'),
    ].find((element) =>
      /search/i.test(element.getAttribute('aria-label') ?? ''),
    )
    opener?.click()
    await sleep(600)
    input = findInput()
  }
  if (!input) {
    return { isClicked: false, reason: 'no search box' }
  }

  // Type one key at a time, at typing speed.
  input.scrollIntoView({ block: 'center' })
  input.focus()
  input.click()
  const setValue = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  ).set
  setValue.call(input, '')
  input.dispatchEvent(new Event('input', { bubbles: true }))
  let typed = ''
  for (const character of ticker.toUpperCase()) {
    await sleep(110 + Math.random() * 180)
    typed += character
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: character, bubbles: true }),
    )
    setValue.call(input, typed)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(
      new KeyboardEvent('keyup', { key: character, bubbles: true }),
    )
  }

  // Wait for the suggestion that links to the symbol, then click it.
  const target = `/symbol/${ticker.toUpperCase()}`
  for (let attempt = 0; attempt < 24; attempt++) {
    await sleep(250)
    const link = [...document.querySelectorAll('a[href]')].find((anchor) => {
      const path = new URL(anchor.href, location.origin).pathname.replace(
        /\/$/,
        '',
      )
      return path.toUpperCase() === target && isVisible(anchor)
    })
    if (link) {
      await sleep(300 + Math.random() * 500)
      link.click()
      return { isClicked: true }
    }
  }
  return { isClicked: false, reason: 'no suggestion' }
}

/** Clicks the symbol page's Analysis tab. */
function clickAnalysisTab(ticker) {
  const target = `/symbol/${ticker.toUpperCase()}/analysis`
  const link = [...document.querySelectorAll('a[href]')].find((anchor) => {
    const path = new URL(anchor.href, location.origin).pathname.replace(
      /\/$/,
      '',
    )
    return (
      path.toUpperCase() === target &&
      (anchor.offsetParent !== null || anchor.getClientRects().length > 0)
    )
  })
  if (!link) {
    return { isClicked: false }
  }
  link.scrollIntoView({ block: 'center' })
  link.click()
  return { isClicked: true }
}

/**
 * Reads every row of the analysis list on the page: title, rating badge,
 * author, date. A row is the nearest block around an article link that also
 * holds an author link. Only rows from the main list are kept (the block
 * with the most rows), so sidebar widgets are ignored.
 */
function readListItems() {
  const RATING = /^(strong buy|buy|hold|sell|strong sell)$/i
  const MONTH = '(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?'
  const DATE = new RegExp(
    `^(today|yesterday|\\d+\\s*(m|min|mins|minutes?|h|hr|hrs|hours?)\\s+ago|([a-z]{3},?\\s+)?${MONTH}\\s+\\d{1,2}(,?\\s+\\d{4})?)$`,
    'i',
  )
  const closestHolding = (element, selector) => {
    let block = element.parentElement
    for (let depth = 0; block && depth < 8; depth++) {
      if (block.querySelector(selector)) {
        return block
      }
      block = block.parentElement
    }
    return null
  }
  const rows = new Map()

  for (const link of document.querySelectorAll('a[href*="/article/"]')) {
    const href = link.getAttribute('href') ?? ''
    const articleId = href.match(/\/article\/(\d+)/)?.[1]
    const title = (link.textContent ?? '').trim().replace(/\s+/g, ' ')
    const isCommentsLink = /^\d+\s+comments?$/i.test(title)
    if (
      !articleId ||
      rows.has(articleId) ||
      title.length < 10 ||
      isCommentsLink
    ) {
      continue
    }

    // A row is the nearest block holding an author link, or on an author's
    // own list (no author per row) the nearest one holding a ticker link.
    const row =
      closestHolding(link, 'a[href*="/author/"]') ??
      closestHolding(link, 'a[href*="/symbol/"]')
    if (!row) {
      continue
    }
    const author = row.querySelector('a[href*="/author/"]')

    const texts = [...row.querySelectorAll('*')]
      .filter((element) => element.children.length === 0)
      .map((element) => (element.textContent ?? '').trim().replace(/\s+/g, ' '))
      .filter((text) => text && text !== title)
    const time = row.querySelector('time')
    const tickers = [...row.querySelectorAll('a[href*="/symbol/"]')]
      .map((anchor) =>
        new URL(anchor.href, location.origin).pathname
          .split('/')[2]
          ?.toUpperCase(),
      )
      .filter(Boolean)
    rows.set(articleId, {
      row,
      item: {
        articleId,
        title,
        url: new URL(href, location.origin).href.split('?')[0],
        rating: texts.find((text) => RATING.test(text)) ?? null,
        authorName: (author?.textContent ?? '').trim() || null,
        authorSlug:
          (author?.getAttribute('href') ?? '').match(
            /\/author\/([^/?#]+)/,
          )?.[1] ?? null,
        dateText:
          (time?.textContent ?? '').trim() ||
          texts.find((text) => DATE.test(text)) ||
          null,
        datetime: time?.getAttribute('datetime') || null,
        tickers: [...new Set(tickers)],
      },
    })
  }

  // Keep the rows of the biggest list: walk up until rows share a parent.
  const entries = [...rows.values()]
  let main = entries
  for (let level = 1; level <= 3 && entries.length > 0; level++) {
    const groups = new Map()
    for (const entry of entries) {
      let parent = entry.row
      for (let step = 0; step < level && parent; step++) {
        parent = parent.parentElement
      }
      groups.set(parent, [...(groups.get(parent) ?? []), entry])
    }
    const biggest = [...groups.values()].sort((a, b) => b.length - a.length)[0]
    if (biggest.length >= 3) {
      main = biggest
      break
    }
  }

  const items = main.map((entry) => entry.item)
  return { items, ratedCount: items.filter((item) => item.rating).length }
}

/** Scrolls down in uneven steps to the bottom, then waits for more rows. */
async function scrollToLoadMore() {
  const sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds))
  const count = () => document.querySelectorAll('a[href*="/article/"]').length
  const isAtBottom = () =>
    innerHeight + scrollY >= document.documentElement.scrollHeight - 300
  const isHidden = () => document.visibilityState === 'hidden'
  if (isHidden()) {
    return { isHidden: true }
  }
  const before = count()

  for (let step = 0; step < 25 && !isAtBottom(); step++) {
    window.scrollBy(0, 300 + Math.random() * 500)
    await sleep(120 + Math.random() * 380)
  }

  // Some lists load more with a button rather than by scrolling.
  const more = [...document.querySelectorAll('button')].find((button) =>
    /^(load|show|see) more/i.test((button.textContent ?? '').trim()),
  )
  more?.click()

  for (let waited = 0; waited < 6000; waited += 300) {
    await sleep(300)
    if (count() > before) {
      return { isGrown: true }
    }
    if (isHidden()) {
      return { isHidden: true }
    }
  }
  return { isGrown: false }
}

// Tab plumbing.

async function inPage(tabId, func, args) {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    func,
    args,
  })
  return injection?.result
}

async function currentPath(tabId) {
  const tab = await chrome.tabs.get(tabId)
  try {
    return new URL(tab.url ?? '').pathname.toLowerCase()
  } catch {
    return ''
  }
}

async function waitForUrl(tabId, isWanted, timeoutMs = 15000) {
  for (let waited = 0; waited < timeoutMs; waited += 400) {
    if (isWanted(await currentPath(tabId))) {
      await sleep(800)
      return true
    }
    await sleep(400)
  }
  return false
}

async function navigate(tabId, url) {
  await chrome.tabs.update(tabId, { url })
  await waitForLoad(tabId)
  await sleep(1200)
}

function waitForLoad(tabId) {
  return new Promise((resolve) => {
    const timer = setTimeout(done, 20000)
    function done() {
      clearTimeout(timer)
      chrome.tabs.onUpdated.removeListener(listener)
      resolve()
    }
    function listener(updatedId, change) {
      if (updatedId === tabId && change.status === 'complete') {
        done()
      }
    }
    chrome.tabs.onUpdated.addListener(listener)
  })
}

/** The open seekingalpha.com tab (or a new one), brought to the front. */
async function seekingAlphaTab() {
  const [existing] = await chrome.tabs.query({ url: `${SITE}/*` })
  const tab =
    existing ?? (await chrome.tabs.create({ url: `${SITE}/`, active: true }))
  if (!existing) {
    await waitForLoad(tab.id)
  }
  await chrome.tabs.update(tab.id, { active: true })
  await chrome.windows.update(tab.windowId, { focused: true })
  return tab
}

// Hindsight.

async function finish(settings, totals, problems) {
  await hindsight(settings, 'POST', '/api/sync/complete', {
    ...totals,
    problems,
  })
}

async function hindsight(settings, method, path, body) {
  const headers = { 'content-type': 'application/json' }
  if (settings.syncToken) {
    headers.authorization = `Bearer ${settings.syncToken}`
  }

  let response
  try {
    response = await fetch(
      `${settings.hindsightUrl.replace(/\/$/, '')}${path}`,
      {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      },
    )
  } catch {
    throw new SyncStop(
      `Could not reach Hindsight at ${settings.hindsightUrl}. Is it running?`,
    )
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new SyncStop(
      payload.error ?? `Hindsight answered ${response.status}.`,
    )
  }
  return payload
}

async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings')
  return { ...DEFAULT_SETTINGS, ...settings }
}

async function setState(patch) {
  const { sync } = await chrome.storage.local.get('sync')
  await chrome.storage.local.set({
    sync: { ...sync, ...patch, updatedAt: Date.now() },
  })
}

function pause([min, max]) {
  return sleep(min + Math.random() * (max - min))
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
