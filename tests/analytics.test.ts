import { describe, expect, it } from 'vitest'
import { Rating } from '@/server/modules/calls/enums/Rating'
import type { CallRecord } from '@/server/modules/calls/types/CallRecord'
import { ConsensusModel } from '@/server/modules/analytics/utils/ConsensusModel'
import { weekEnds } from '@/server/modules/analytics/utils/weekEnds'
import { windowConsensus } from '@/server/modules/analytics/utils/windowConsensus'
import { OutcomePriors } from '@/server/modules/analytics/utils/OutcomePriors'
import { spearman } from '@/server/modules/analytics/utils/spearman'
import { TrackRecordModel } from '@/server/modules/analytics/utils/TrackRecordModel'
import { Horizon } from '@/server/modules/outcomes/enums/Horizon'
import type { OutcomeRecord } from '@/server/modules/outcomes/types/OutcomeRecord'

function call(overrides: Partial<CallRecord>): CallRecord {
  const publishedOn = overrides.publishedOn ?? '2026-06-01'
  return {
    id: 'call-1',
    source: 'SEEKING_ALPHA',
    companyId: 'company-1',
    ticker: 'ACME',
    companyName: 'Acme Corp',
    authorId: 'author-1',
    authorName: 'Author One',
    authorSlug: 'author-one',
    authorUrl: null,
    rating: Rating.BUY,
    publishedAt: new Date(`${publishedOn}T14:00:00Z`),
    publishedOn,
    entryDate: publishedOn,
    entryPrice: 100,
    title: null,
    url: null,
    ...overrides,
  }
}

function outcome(overrides: Partial<OutcomeRecord>): OutcomeRecord {
  return {
    callId: 'call-1',
    source: 'SEEKING_ALPHA',
    companyId: 'company-1',
    ticker: 'ACME',
    authorId: 'author-1',
    rating: Rating.BUY,
    publishedAt: new Date('2026-01-01T14:00:00Z'),
    entryDate: '2026-01-02',
    horizon: Horizon.THREE_MONTHS,
    exitDate: '2026-04-02',
    stockReturn: 0.1,
    benchmarkReturn: 0.02,
    excessReturn: 0.08,
    maxRunup: 0.12,
    maxDrawdown: -0.03,
    targetHitOn: null,
    stopHitOn: null,
    isHit: true,
    ...overrides,
  }
}

describe('spearman', () => {
  it('is 1 for a perfectly ordered relation and handles ties', () => {
    expect(spearman([1, 2, 3, 4], [10, 20, 30, 40])).toBeCloseTo(1)
    expect(spearman([-2, -1, 0, 1, 2], [5, 4, 3, 2, 1])).toBeCloseTo(-1)
    expect(spearman([1, 1, 2, 2], [1, 2, 3, 4])).toBeCloseTo(0.894, 3)
  })

  it('is null with no variation or too few pairs', () => {
    expect(spearman([1, 1, 1], [1, 2, 3])).toBeNull()
    expect(spearman([1, 2], [1, 2])).toBeNull()
  })
})

describe('TrackRecordModel', () => {
  it('shrinks an edge toward zero and turns it into a weight', () => {
    const calls = [call({}), call({ id: 'call-2' })]
    const outcomes = [
      outcome({ excessReturn: 0.1 }),
      outcome({ callId: 'call-2', rating: Rating.SELL, excessReturn: -0.1 }),
    ]
    const record = TrackRecordModel.build(calls, outcomes).get('author-1')!
    // Two calls with a 10% edge each, shrunk as if 10 more had none.
    expect(record.meanEdge).toBeCloseTo(0.1)
    expect(record.skill).toBeCloseTo(0.2 / 12)
    expect(record.weight).toBeCloseTo(1 + 10 * (0.2 / 12))
    expect(record.hitRate).toBe(1)
  })

  it('only sees outcomes matured by the as of date', () => {
    const calls = [call({ publishedOn: '2026-01-01' })]
    const records = TrackRecordModel.build(calls, [outcome({})], '2026-03-01')
    expect(records.get('author-1')?.scoredCount).toBe(0)
    expect(records.get('author-1')?.weight).toBe(1)
  })
})

describe('ConsensusModel', () => {
  const priors = OutcomePriors.fromOutcomes([])

  it('blends the latest call per author, weighted by recency', () => {
    const consensus = ConsensusModel.compute({
      asOf: '2026-06-01',
      calls: [
        call({
          id: 'old',
          rating: Rating.STRONG_SELL,
          publishedOn: '2026-03-01',
        }),
        call({
          id: 'new',
          rating: Rating.STRONG_BUY,
          publishedOn: '2026-06-01',
        }),
        call({
          id: 'other',
          authorId: 'author-2',
          rating: Rating.SELL,
          publishedOn: '2026-04-02',
        }),
      ],
      trackRecords: new Map(),
      priors,
      price: 100,
    })!
    // author-1's latest is the Strong Buy; author-2's Sell is 60 days old,
    // so it carries half the weight: (2 * 1 + -1 * 0.5) / 1.5 = 1.
    expect(consensus.callCount).toBe(2)
    expect(consensus.score).toBeCloseTo(1)
    expect(consensus.rating).toBe(Rating.BUY)
  })

  it('ignores calls outside the lookback window', () => {
    const consensus = ConsensusModel.compute({
      asOf: '2026-12-31',
      calls: [call({ publishedOn: '2026-01-01' })],
      trackRecords: new Map(),
      priors,
      price: null,
    })
    expect(consensus).toBeNull()
  })
})

describe('OutcomePriors', () => {
  it('pulls thin buckets toward the market', () => {
    const priors = OutcomePriors.fromOutcomes([
      outcome({ stockReturn: 0.3, benchmarkReturn: 0.02, excessReturn: 0.28 }),
    ])
    const expected = priors.expectedFor(Rating.BUY, Horizon.THREE_MONTHS)
    // One outcome against 20 phantom calls at the market's 2%.
    expect(expected.stockReturn).toBeCloseTo((0.3 + 20 * 0.02) / 21)
    expect(expected.excessReturn).toBeCloseTo(0.28 / 21)
    expect(expected.low).toBeNull()
  })
})

describe('weekEnds', () => {
  it('lists the Fridays in a range', () => {
    // October 1, 2026 is a Thursday.
    expect(weekEnds('2026-10-01', '2026-10-20')).toEqual([
      '2026-10-02',
      '2026-10-09',
      '2026-10-16',
    ])
  })
})

describe('windowConsensus', () => {
  const calls = [
    call({
      id: 'a-old',
      authorId: 'a',
      rating: Rating.SELL,
      publishedOn: '2026-05-01',
    }),
    call({
      id: 'a-new',
      authorId: 'a',
      rating: Rating.STRONG_BUY,
      publishedOn: '2026-10-01',
    }),
    call({
      id: 'b',
      authorId: 'b',
      rating: Rating.HOLD,
      publishedOn: '2026-09-20',
    }),
    call({
      id: 'c',
      authorId: 'c',
      rating: Rating.SELL,
      publishedOn: '2026-06-15',
    }),
  ]

  it('counts each author once, by their latest call in the window', () => {
    // Last month: author a (Strong Buy) and author b (Hold) only.
    const month = windowConsensus(calls, '2026-10-18', 1)
    expect(month.authorCount).toBe(2)
    expect(month.score).toBeCloseTo(1)
    expect(month.rating).toBe(Rating.BUY)
    expect(month.views.map((view) => view.callId)).toEqual(['a-new', 'b'])
  })

  it('reaches further back in a longer window', () => {
    // Six months adds author c's Sell; a still counts once, as Strong Buy.
    const half = windowConsensus(calls, '2026-10-18', 6)
    expect(half.authorCount).toBe(3)
    expect(half.score).toBeCloseTo((2 + 0 - 1) / 3)
    expect(half.mix).toEqual({ STRONG_BUY: 1, HOLD: 1, SELL: 1 })
  })

  it('is empty when nobody wrote in the window', () => {
    const empty = windowConsensus(calls, '2027-06-01', 1)
    expect(empty.score).toBeNull()
    expect(empty.rating).toBeNull()
  })
})
