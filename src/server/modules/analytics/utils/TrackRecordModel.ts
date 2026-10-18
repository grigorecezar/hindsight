import type { CallRecord } from '../../calls/types/CallRecord'
import { ratingDirection } from '../../calls/utils/ratingDirection'
import { Horizon } from '../../outcomes/enums/Horizon'
import type { OutcomeRecord } from '../../outcomes/types/OutcomeRecord'
import type { AuthorTrackRecord } from '../types/AuthorTrackRecord'

/**
 * Scores authors on their past calls, and turns that score into the weight
 * their calls carry in a consensus.
 *
 * An author's edge is the average excess return in the direction of their
 * calls over the primary horizon (a sell that lagged the market by 4% is a
 * +4% edge). It is shrunk toward zero as if they had made PRIOR_CALLS more
 * calls with no edge, so three lucky calls do not top the board.
 */
export class TrackRecordModel {
  public static readonly PRIMARY_HORIZON = Horizon.THREE_MONTHS
  private static readonly PRIOR_CALLS = 10
  // Weight gained per unit of skill: a 5% skill is a weight of 1.5.
  private static readonly WEIGHT_PER_SKILL = 10
  private static readonly MIN_WEIGHT = 0.25
  private static readonly MAX_WEIGHT = 3

  /**
   * Track records as they stood on `asOf` (only calls published and outcomes
   * matured by then), or as of now when `asOf` is null.
   */
  public static build(
    calls: readonly CallRecord[],
    outcomes: readonly OutcomeRecord[],
    asOf: string | null = null,
  ): Map<string, AuthorTrackRecord> {
    const knownCalls = calls.filter(
      (call) => call.authorId && (!asOf || call.publishedOn <= asOf),
    )
    const scoredOutcomes = outcomes.filter(
      (outcome) =>
        outcome.authorId &&
        outcome.horizon === TrackRecordModel.PRIMARY_HORIZON &&
        (!asOf || outcome.exitDate <= asOf),
    )

    const callsByAuthor = Map.groupBy(knownCalls, (call) => call.authorId!)
    const outcomesByAuthor = Map.groupBy(
      scoredOutcomes,
      (outcome) => outcome.authorId!,
    )

    const records = new Map<string, AuthorTrackRecord>()
    for (const [authorId, authorCalls] of callsByAuthor) {
      const authorOutcomes = outcomesByAuthor.get(authorId) ?? []
      records.set(
        authorId,
        TrackRecordModel.record(authorCalls, authorOutcomes),
      )
    }
    return records
  }

  private static record(
    calls: CallRecord[],
    outcomes: OutcomeRecord[],
  ): AuthorTrackRecord {
    const edges = outcomes
      .filter((outcome) => ratingDirection(outcome.rating) !== 0)
      .map((outcome) => ratingDirection(outcome.rating) * outcome.excessReturn)
    const edgeSum = edges.reduce((sum, edge) => sum + edge, 0)
    const skill = edgeSum / (edges.length + TrackRecordModel.PRIOR_CALLS)
    const latest = calls.reduce((newest, call) =>
      call.publishedAt > newest.publishedAt ? call : newest,
    )

    return {
      authorId: latest.authorId!,
      authorName: latest.authorName ?? 'Unknown author',
      authorSlug: latest.authorSlug,
      authorUrl: latest.authorUrl,
      source: latest.source,
      callCount: calls.length,
      companyCount: new Set(calls.map((call) => call.companyId)).size,
      lastCallAt: latest.publishedAt,
      scoredCount: outcomes.length,
      hitRate:
        outcomes.length > 0
          ? outcomes.filter((outcome) => outcome.isHit).length / outcomes.length
          : null,
      meanEdge: edges.length > 0 ? edgeSum / edges.length : null,
      skill,
      weight: TrackRecordModel.weightForSkill(skill),
    }
  }

  private static weightForSkill(skill: number): number {
    const weight = 1 + TrackRecordModel.WEIGHT_PER_SKILL * skill
    return Math.min(
      TrackRecordModel.MAX_WEIGHT,
      Math.max(TrackRecordModel.MIN_WEIGHT, weight),
    )
  }
}
