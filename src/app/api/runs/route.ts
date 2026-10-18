import { after, connection } from 'next/server'
import { createLogger } from '@/server/logging/createLogger'
import { RunKind } from '@/server/modules/runs/enums/RunKind'
import { RunTrigger } from '@/server/modules/runs/enums/RunTrigger'
import { getServices } from '@/server/services'

const logger = createLogger('api/runs')

/**
 * Starts a run over HTTP, for schedulers that call URLs instead of commands.
 * `Authorization: Bearer $CRON_SECRET`, body `{ "kind": "AUTO" }` or any run
 * kind. Answers 202 at once; the run continues in the background.
 */
export async function POST(request: Request): Promise<Response> {
  await connection()
  const { config, jobRunner } = getServices()
  const isAuthorized =
    Boolean(config.CRON_SECRET) &&
    request.headers.get('authorization') === `Bearer ${config.CRON_SECRET}`
  if (!isAuthorized) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as { kind?: string }
  const kind = body.kind ?? 'AUTO'
  const isKnownKind =
    kind === 'AUTO' || Object.values(RunKind).includes(kind as RunKind)
  if (!isKnownKind) {
    return Response.json({ error: 'unknown kind' }, { status: 400 })
  }

  after(async () => {
    const work =
      kind === 'AUTO'
        ? jobRunner.auto(RunTrigger.CRON)
        : jobRunner.run(kind as RunKind, { trigger: RunTrigger.CRON })
    await work.catch((error) =>
      logger.debug({ err: error }, 'http run ended with an error'),
    )
  })
  return Response.json({ accepted: true, kind }, { status: 202 })
}
