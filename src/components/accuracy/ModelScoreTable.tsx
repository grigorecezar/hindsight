import { Num } from '@/components/ui/Num'
import { Table, Td, Th } from '@/components/ui/Table'
import { formatPercent } from '@/lib/format/formatPercent'
import { formatRate } from '@/lib/format/formatRate'
import { formatScore } from '@/lib/format/formatScore'
import type { ModelHorizonScore } from '@/server/modules/analytics/types/ModelHorizonScore'
import { horizonDefinition } from '@/server/modules/outcomes/utils/horizonDefinition'

/** The consensus scored like an author, from its month end snapshots. */
export function ModelScoreTable({ scores }: { scores: ModelHorizonScore[] }) {
  return (
    <Table caption="How past consensus snapshots did">
      <thead>
        <tr>
          <Th>Horizon</Th>
          <Th align="right">Snapshots scored</Th>
          <Th align="right">Hit rate</Th>
          <Th align="right">Correlation</Th>
          <Th align="right">After a buy</Th>
          <Th align="right">After a hold</Th>
          <Th align="right">After a sell</Th>
        </tr>
      </thead>
      <tbody>
        {scores.map((score) => (
          <tr key={score.horizon}>
            <Td>{horizonDefinition(score.horizon).label}</Td>
            <Td align="right">
              <Num>{score.sampleSize}</Num>
            </Td>
            <Td align="right">
              <Num>{formatRate(score.hitRate)}</Num>
            </Td>
            <Td align="right">
              <Num>{formatScore(score.correlation)}</Num>
            </Td>
            <Td align="right">
              <Num>{formatPercent(score.bullishExcess)}</Num>
            </Td>
            <Td align="right">
              <Num>{formatPercent(score.holdExcess)}</Num>
            </Td>
            <Td align="right">
              <Num>{formatPercent(score.bearishExcess)}</Num>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
