import { closeDb } from '@/server/db/client'
import { createLogger } from '@/server/logging/createLogger'
import { RunKind } from '@/server/modules/runs/enums/RunKind'
import { RunTrigger } from '@/server/modules/runs/enums/RunTrigger'
import { getServices } from '@/server/services'

const USAGE = `Usage: npm run job -- <command> [--ticker AAPL] [--cron]

Commands:
  auto       What the daily cron runs: monthly, weekly or backfill when due
  weekly     Pull new calls, then rescore
  monthly    Re-read the last RESYNC_DAYS of calls, then rescore
  backfill   First sync for companies that have never been synced
  refresh    Rescore from stored data, no source requests
  add        Add tickers to the watchlist: npm run job -- add AAPL MSFT
  follow     Follow authors: npm run job -- follow small-cap-connoisseur`

const KINDS: Record<string, RunKind> = {
  weekly: RunKind.WEEKLY,
  monthly: RunKind.MONTHLY,
  backfill: RunKind.BACKFILL,
  refresh: RunKind.REFRESH,
}

async function main(): Promise<void> {
  const logger = createLogger('job')
  const [command, ...rest] = process.argv.slice(2)
  const trigger = rest.includes('--cron') ? RunTrigger.CRON : RunTrigger.CLI
  const services = getServices()

  if (command === 'add') {
    const tickers = rest.filter((arg) => !arg.startsWith('--'))
    for (const ticker of tickers) {
      const { company, isNew } = await services.companiesService.add(ticker)
      logger.info({ ticker: company.ticker, isNew }, 'company on watchlist')
    }
    return
  }

  if (command === 'follow') {
    const inputs = rest.filter((arg) => !arg.startsWith('--'))
    for (const input of inputs) {
      const { author, isNew } = await services.authorsService.follow(input)
      logger.info({ slug: author.externalId, isNew }, 'author followed')
    }
    return
  }

  if (command === 'auto') {
    await services.jobRunner.auto(trigger)
    return
  }

  const kind = KINDS[command ?? '']
  if (!kind) {
    console.log(USAGE)
    process.exitCode = 1
    return
  }

  const companyIds = await companyIdsFor(rest)
  const runId = await services.jobRunner.run(kind, { trigger, companyIds })
  logger.info({ runId, kind }, runId ? 'job done' : 'job skipped')
}

/** --ticker AAPL --ticker MSFT limits the source sync to those companies. */
async function companyIdsFor(args: string[]): Promise<string[] | undefined> {
  const tickers = args.flatMap((arg, index) =>
    args[index - 1] === '--ticker' ? [arg] : [],
  )
  if (tickers.length === 0) {
    return undefined
  }

  const { companiesService } = getServices()
  const companies = await Promise.all(
    tickers.map((ticker) => companiesService.findByTicker(ticker)),
  )
  return companies.flatMap((company) => (company ? [company.id] : []))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => closeDb())
