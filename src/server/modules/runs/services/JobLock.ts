import type { ReservedSql, Sql } from 'postgres'

/**
 * One run at a time, across every process (the web app and the cron
 * service), through a Postgres advisory lock. The lock is held on one
 * reserved connection and dies with it, so a crashed run never leaves it
 * stuck.
 */
export class JobLock {
  // Any fixed number. It only has to differ from other advisory locks.
  private static readonly LOCK_KEY = 72_114_221

  constructor(private readonly sql: Sql) {}

  /** Runs `work` under the lock, or returns null if another run holds it. */
  public async withLock<T>(work: () => Promise<T>): Promise<T | null> {
    const connection = await this.sql.reserve()
    const isAcquired = await this.tryAcquire(connection)
    if (!isAcquired) {
      connection.release()
      return null
    }

    try {
      return await work()
    } finally {
      await connection`select pg_advisory_unlock(${JobLock.LOCK_KEY})`
      connection.release()
    }
  }

  private async tryAcquire(connection: ReservedSql): Promise<boolean> {
    try {
      const [row] = await connection<{ isAcquired: boolean }[]>`
        select pg_try_advisory_lock(${JobLock.LOCK_KEY}) as "isAcquired"
      `
      return row.isAcquired
    } catch (error) {
      connection.release()
      throw error
    }
  }
}
