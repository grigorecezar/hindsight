import { addDays } from '@/server/common/utils/addDays'
import { todayInNewYork } from '@/server/common/utils/todayInNewYork'
import { CallsService } from '../../calls/services/CallsService'
import type { CallRecord } from '../../calls/types/CallRecord'
import type { Company } from '../../companies/types/Company'
import { OutcomesService } from '../../outcomes/services/OutcomesService'
import { PricesService } from '../../prices/services/PricesService'
import { PriceSeries } from '../../prices/utils/PriceSeries'
import type { ChartPoint } from '../types/ChartPoint'
import type { CompanyReport } from '../types/CompanyReport'
import { CONSENSUS_WINDOWS } from '../constants/CONSENSUS_WINDOWS'
import { buildPricePeriods } from '../utils/buildPricePeriods'
import { toCallRow } from '../utils/toCallRow'
import { windowConsensus } from '../utils/windowConsensus'
import { AccuracyService } from './AccuracyService'
import { ConsensusService } from './ConsensusService'

/** Assembles the company page from the other analytics services. */
export class CompanyReportService {
  // With no calls yet, the chart still shows this much history.
  private static readonly DEFAULT_CHART_DAYS = 365
  private static readonly CHART_PADDING_DAYS = 30

  constructor(
    private readonly callsService: CallsService,
    private readonly outcomesService: OutcomesService,
    private readonly pricesService: PricesService,
    private readonly accuracyService: AccuracyService,
    private readonly consensusService: ConsensusService,
    private readonly settings: { benchmarkTicker: string },
  ) {}

  public async build(company: Company): Promise<CompanyReport> {
    const { benchmarkTicker } = this.settings
    const [
      callRecords,
      outcomeRecords,
      seriesByTicker,
      accuracy,
      trackRecords,
      snapshots,
    ] = await Promise.all([
      this.callsService.listRecords(company.id),
      this.outcomesService.listRecords(),
      this.pricesService.loadSeries([company.ticker, benchmarkTicker]),
      this.accuracyService.report(company.id),
      this.accuracyService.trackRecords(),
      this.consensusService.snapshotsFor(company.id),
    ])
    const series =
      seriesByTicker.get(company.ticker) ??
      PriceSeries.fromDailyCloses(company.ticker, [])
    const benchmark =
      seriesByTicker.get(benchmarkTicker) ??
      PriceSeries.fromDailyCloses(benchmarkTicker, [])

    const outcomesByCall = Map.groupBy(
      outcomeRecords.filter((outcome) => outcome.companyId === company.id),
      (outcome) => outcome.callId,
    )
    const authorIds = new Set(callRecords.map((call) => call.authorId))
    const chartStart = this.chartStartIndex(callRecords, series)

    return {
      company,
      windows: CONSENSUS_WINDOWS.map((months) =>
        windowConsensus(callRecords, todayInNewYork(), months),
      ),
      accuracy,
      calls: callRecords
        .map((call) =>
          toCallRow(call, outcomesByCall.get(call.id) ?? [], series, benchmark),
        )
        .reverse(),
      chartPoints: this.chartPoints(series, chartStart),
      periods: buildPricePeriods(series, benchmark, callRecords, chartStart),
      chartMarkers: callRecords
        .filter((call) => call.entryDate && call.entryPrice !== null)
        .map((call) => ({
          date: call.entryDate!,
          price: call.entryPrice!,
          rating: call.rating,
          authorName: call.authorName,
          title: call.title,
        })),
      authors: trackRecords.filter((record) => authorIds.has(record.authorId)),
      snapshots,
      benchmarkTicker,
    }
  }

  /** The chart (and the periods) start a month before the first call. */
  private chartStartIndex(
    callRecords: CallRecord[],
    series: PriceSeries,
  ): number {
    const firstCallDate =
      callRecords[0]?.entryDate ?? callRecords[0]?.publishedOn
    const from = firstCallDate
      ? addDays(firstCallDate, -CompanyReportService.CHART_PADDING_DAYS)
      : addDays(todayInNewYork(), -CompanyReportService.DEFAULT_CHART_DAYS)
    return Math.max(0, series.indexOnOrAfter(from))
  }

  private chartPoints(series: PriceSeries, fromIndex: number): ChartPoint[] {
    const points: ChartPoint[] = []
    for (let index = fromIndex; index < series.length; index++) {
      points.push({ date: series.dateAt(index), close: series.closeAt(index) })
    }
    return points
  }
}
