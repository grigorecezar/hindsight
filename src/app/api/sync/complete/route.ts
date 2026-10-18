import { after, connection } from 'next/server'
import { z } from 'zod'
import { createLogger } from '@/server/logging/createLogger'
import { RunKind } from '@/server/modules/runs/enums/RunKind'
import { RunTrigger } from '@/server/modules/runs/enums/RunTrigger'
import { getServices } from '@/server/services'
import { isSyncAuthorized } from '../_lib/isSyncAuthorized'
import { unauthorized } from '../_lib/unauthorized'

const logger = createLogger('api/sync/complete')

const inputSchema = z.object({
  companyCount: z.number().int().min(0),
  pageCount: z.number().int().min(0),
  callsSaved: z.number().int().min(0),
  unratedSkipped: z.number().int().min(0),
  problems: z
    .array(z.object({ ticker: z.string(), message: z.string() }))
    .max(100),
})

/**
 * The extension finished (or stopped). Records the sync as a run and
 * rescores everything in the background: prices, outcomes, consensus.
 */
export async function POST(request: Request): Promise<Response> {
  await connection()
  if (!isSyncAuthorized(request)) {
    return unauthorized()
  }

  const parsed = inputSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ error: 'Malformed sync summary.' }, { status: 400 })
  }

  const summary = parsed.data
  const { jobRunner } = getServices()
  after(async () => {
    await jobRunner
      .run(RunKind.BROWSER_SYNC, {
        trigger: RunTrigger.EXTENSION,
        syncStats: {
          companyCount: summary.companyCount,
          sourceRequests: summary.pageCount,
          callsFetched: summary.callsSaved,
          callsSaved: summary.callsSaved,
          unratedSkipped: summary.unratedSkipped,
          problems: summary.problems.map((problem) => ({
            ...problem,
            step: 'Browser sync',
          })),
        },
      })
      .catch((error) =>
        logger.debug({ err: error }, 'browser sync run ended with an error'),
      )
  })
  return Response.json({ accepted: true }, { status: 202 })
}
