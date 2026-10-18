// Hindsight Sync popup: start a sync, show its progress, edit settings.

const DEFAULT_SETTINGS = {
  hindsightUrl: 'http://localhost:3000',
  syncToken: '',
}
const LOCAL_HOSTS = ['localhost', '127.0.0.1']

const elements = {
  sync: document.getElementById('sync'),
  message: document.getElementById('status-message'),
  detail: document.getElementById('status-detail'),
  progress: document.getElementById('progress'),
  progressBar: document.getElementById('progress-bar'),
  url: document.getElementById('hindsight-url'),
  token: document.getElementById('sync-token'),
  save: document.getElementById('save'),
  settingsMessage: document.getElementById('settings-message'),
  openApp: document.getElementById('open-app'),
}

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

async function getSettings() {
  const { settings } = await chrome.storage.local.get('settings')
  return { ...DEFAULT_SETTINGS, ...settings }
}

function render(sync) {
  const isRunning = sync?.status === 'running'
  elements.sync.disabled = isRunning
  elements.sync.textContent = isRunning ? 'Syncing' : 'Sync'
  elements.progress.hidden = !isRunning

  if (!sync) {
    elements.message.textContent = 'Not synced yet.'
    elements.detail.textContent =
      'The first sync pulls the history set in Hindsight. After that, only what is new.'
    return
  }

  elements.message.textContent = sync.message ?? ''
  elements.detail.textContent = detailFor(sync)
  const share = sync.companyCount
    ? (sync.companyIndex ?? 0) / sync.companyCount
    : 0
  elements.progressBar.style.width = `${Math.round(share * 100)}%`
}

function detailFor(sync) {
  if (sync.status === 'running') {
    return `Company ${sync.companyIndex ?? 0} of ${sync.companyCount ?? '?'} · ${sync.pageCount ?? 0} pages read · ${sync.callsSaved ?? 0} calls saved`
  }
  if (sync.lastSuccessAt) {
    return `Last synced ${timeFormatter.format(new Date(sync.lastSuccessAt))}.`
  }
  return ''
}

elements.sync.addEventListener('click', async () => {
  elements.sync.disabled = true
  await chrome.runtime.sendMessage({ type: 'sync:start' })
})

elements.save.addEventListener('click', async () => {
  const hindsightUrl = (
    elements.url.value.trim() || DEFAULT_SETTINGS.hindsightUrl
  ).replace(/\/$/, '')
  let origin
  try {
    origin = new URL(hindsightUrl).origin
  } catch {
    elements.settingsMessage.textContent = 'That address does not look right.'
    return
  }

  // A deployed Hindsight needs permission to be reached. Local needs none.
  const isLocal = LOCAL_HOSTS.includes(new URL(origin).hostname)
  const isGranted =
    isLocal || (await chrome.permissions.request({ origins: [`${origin}/*`] }))
  if (!isGranted) {
    elements.settingsMessage.textContent =
      'Without permission the extension cannot reach that address.'
    return
  }

  await chrome.storage.local.set({
    settings: { hindsightUrl, syncToken: elements.token.value.trim() },
  })
  elements.settingsMessage.textContent = 'Saved.'
})

elements.openApp.addEventListener('click', async (event) => {
  event.preventDefault()
  const { hindsightUrl } = await getSettings()
  chrome.tabs.create({ url: hindsightUrl })
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.sync) {
    render(changes.sync.newValue)
  }
})

async function init() {
  const settings = await getSettings()
  elements.url.value = settings.hindsightUrl
  elements.token.value = settings.syncToken
  const { sync } = await chrome.storage.local.get('sync')
  render(sync)
}

init()
