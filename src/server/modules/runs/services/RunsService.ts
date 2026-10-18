import { and, desc, eq, inArray, isNotNull, isNull } from 'drizzle-orm'
import { runs } from '@/server/db/schema'
import type { Database } from '@/server/db/types/Database'
import type { RunKind } from '../enums/RunKind'
import type { RunTrigger } from '../enums/RunTrigger'
import type { Run } from '../types/Run'
import type { RunStats } from '../types/RunStats'

/** The history of runs: when each started, how it ended, what it did. */
export class RunsService {
  constructor(private readonly db: Database) {}

  public async start(kind: RunKind, trigger: RunTrigger): Promise<Run> {
    const [run] = await this.db
      .insert(runs)
      .values({ kind, trigger })
      .returning()
    return run
  }

  public async finish(runId: string, stats: RunStats): Promise<void> {
    await this.db
      .update(runs)
      .set({ finishedAt: new Date(), stats })
      .where(eq(runs.id, runId))
  }

  public async fail(
    runId: string,
    error: string,
    stats: RunStats,
  ): Promise<void> {
    await this.db
      .update(runs)
      .set({ failedAt: new Date(), error, stats })
      .where(eq(runs.id, runId))
  }

  /**
   * Marks runs that never ended as failed. Called while holding the job
   * lock, when no other run can be going, so any open run died mid way.
   */
  public async closeAbandoned(): Promise<void> {
    await this.db
      .update(runs)
      .set({ failedAt: new Date(), error: 'Stopped before finishing.' })
      .where(and(isNull(runs.finishedAt), isNull(runs.failedAt)))
  }

  public async recent(limit = 30): Promise<Run[]> {
    return this.db
      .select()
      .from(runs)
      .orderBy(desc(runs.startedAt))
      .limit(limit)
  }

  /** The most recent run of any of these kinds that finished. */
  public async lastFinished(kinds: RunKind[]): Promise<Run | null> {
    const [run] = await this.db
      .select()
      .from(runs)
      .where(and(inArray(runs.kind, kinds), isNotNull(runs.finishedAt)))
      .orderBy(desc(runs.startedAt))
      .limit(1)
    return run ?? null
  }

  public async current(): Promise<Run | null> {
    const [run] = await this.db
      .select()
      .from(runs)
      .where(and(isNull(runs.finishedAt), isNull(runs.failedAt)))
      .orderBy(desc(runs.startedAt))
      .limit(1)
    return run ?? null
  }
}
