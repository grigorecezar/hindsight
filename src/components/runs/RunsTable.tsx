import { Num } from '@/components/ui/Num'
import { Table, Td, Th } from '@/components/ui/Table'
import { formatShortDate } from '@/lib/format/formatDate'
import { formatDuration } from '@/lib/format/formatDuration'
import { formatNumber } from '@/lib/format/formatNumber'
import type { Run } from '@/server/modules/runs/types/Run'

const KIND_LABELS: Record<string, string> = {
  BACKFILL: 'Backfill',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  REFRESH: 'Rescore',
  BROWSER_SYNC: 'Browser sync',
}
const TRIGGER_LABELS: Record<string, string> = {
  CRON: 'Schedule',
  APP: 'App',
  CLI: 'Command line',
  EXTENSION: 'Extension',
}
const timeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'America/New_York',
})

export function RunsTable({ runs }: { runs: Run[] }) {
  return (
    <Table caption="Recent runs">
      <thead>
        <tr>
          <Th>Started</Th>
          <Th>Kind</Th>
          <Th>Status</Th>
          <Th align="right">Calls saved</Th>
          <Th align="right">Pages read</Th>
          <Th>Problems</Th>
        </tr>
      </thead>
      <tbody>
        {runs.map((run) => (
          <tr key={run.id}>
            <Td className="whitespace-nowrap">
              {formatShortDate(run.startedAt)}
              <span className="block text-[12px] text-ink/65">
                {timeFormatter.format(run.startedAt)} New York ·{' '}
                {TRIGGER_LABELS[run.trigger]}
              </span>
            </Td>
            <Td>{KIND_LABELS[run.kind]}</Td>
            <Td className="whitespace-nowrap">
              <Status run={run} />
            </Td>
            <Td align="right">
              <Num>{formatNumber(run.stats?.callsSaved)}</Num>
            </Td>
            <Td align="right">
              <Num>{formatNumber(run.stats?.sourceRequests)}</Num>
            </Td>
            <Td className="min-w-[14rem] text-[13px] text-ink/75">
              {run.error ? <p className="text-ink">{run.error}</p> : null}
              {run.stats?.problems.slice(0, 5).map((problem, index) => (
                <p key={index}>
                  <span className="font-medium text-ink">{problem.ticker}</span>{' '}
                  {problem.step}: {problem.message}
                </p>
              ))}
              {(run.stats?.problems.length ?? 0) > 5 ? (
                <p className="text-ink/65">
                  and {run.stats!.problems.length - 5} more
                </p>
              ) : null}
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}

function Status({ run }: { run: Run }) {
  if (run.failedAt) {
    return <span className="font-medium">Failed</span>
  }
  if (run.finishedAt) {
    return <span>Done in {formatDuration(run.startedAt, run.finishedAt)}</span>
  }
  return <span className="font-medium">Running</span>
}
