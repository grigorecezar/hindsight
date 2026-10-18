'use client'

import { useMemo, useRef, useState } from 'react'
import { RATING_COLORS } from '@/components/calls/ratingColors'
import {
  formatAxisPrice,
  monthTicks,
  niceTicks,
} from '@/components/charts/chartScales'
import { useWidth } from '@/components/charts/useWidth'
import { formatShortDate } from '@/lib/format/formatDate'
import { formatPercent } from '@/lib/format/formatPercent'
import { formatPrice } from '@/lib/format/formatPrice'
import { describePeriod } from '@/lib/periods/describePeriod'
import type { ChartMarker } from '@/server/modules/analytics/types/ChartMarker'
import type { ChartPoint } from '@/server/modules/analytics/types/ChartPoint'
import type { PricePeriod } from '@/server/modules/analytics/types/PricePeriod'
import { ratingDirection } from '@/server/modules/calls/utils/ratingDirection'

const MARGIN = { top: 28, right: 16, bottom: 28, left: 60 }
const HEIGHT = 340

interface Span {
  period: PricePeriod
  start: number
  end: number
}

/**
 * The stock's price split into its periods. A flat period is a horizontal
 * line at its level over a faint band of its range; a jump or drop is
 * labelled with its size. Click a period to read it below.
 */
export function PeriodsChart({
  points,
  periods,
  band,
  markers,
  isShowingCalls,
  selectedIndex,
  onSelect,
}: {
  points: ChartPoint[]
  periods: PricePeriod[]
  band: number
  markers: ChartMarker[]
  isShowingCalls: boolean
  selectedIndex: number | null
  onSelect: (index: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const width = useWidth(containerRef)
  const [hover, setHover] = useState<{ index: number; span: number } | null>(
    null,
  )

  const layout = useMemo(() => {
    if (width === 0 || points.length < 2) {
      return null
    }
    const indexByDate = new Map(
      points.map((point, index) => [point.date, index]),
    )
    const spans: Span[] = periods.flatMap((period) => {
      const start = indexByDate.get(period.startDate)
      const end = indexByDate.get(period.endDate)
      return start === undefined || end === undefined
        ? []
        : [{ period, start, end }]
    })
    const innerWidth = width - MARGIN.left - MARGIN.right
    const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom
    const yTicks = niceTicks(
      Math.min(...points.map((point) => point.close)),
      Math.max(...points.map((point) => point.close)),
      5,
    )
    const yMin = yTicks[0]
    const yMax = yTicks[yTicks.length - 1]
    const x = (index: number) =>
      MARGIN.left + (index / (points.length - 1)) * innerWidth
    const y = (price: number) =>
      MARGIN.top + (1 - (price - yMin) / (yMax - yMin || 1)) * innerHeight
    return {
      spans,
      x,
      y,
      yTicks,
      innerWidth,
      indexByDate,
      xTicks: monthTicks(
        points.map((point) => point.date),
        Math.max(2, Math.floor(innerWidth / 90)),
      ),
      path: points
        .map(
          (point, index) =>
            `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(point.close).toFixed(1)}`,
        )
        .join(''),
    }
  }, [points, periods, width])

  const spanAt = (index: number) =>
    layout?.spans.findLastIndex(
      (span) => index >= span.start && index <= span.end,
    ) ?? -1

  const onPointerMove = (event: React.PointerEvent<SVGRectElement>) => {
    if (!layout) {
      return
    }
    const bounds = event.currentTarget.getBoundingClientRect()
    const raw =
      ((event.clientX - bounds.left) / layout.innerWidth) * (points.length - 1)
    const index = Math.min(points.length - 1, Math.max(0, Math.round(raw)))
    setHover({ index, span: spanAt(index) })
  }

  const bottom = HEIGHT - MARGIN.bottom
  const hovered = hover && layout ? layout.spans[hover.span] : null

  return (
    <div
      ref={containerRef}
      className="relative w-full"
      style={{ height: HEIGHT }}
    >
      {layout ? (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label="Price split into flat periods and moves"
          className="block"
        >
          {/* Selected and hovered period backgrounds. */}
          {layout.spans.map((span, index) => {
            const isSelected = periods.indexOf(span.period) === selectedIndex
            const isHovered = hover?.span === index
            return (
              <rect
                key={span.period.startDate}
                x={layout.x(span.start)}
                y={MARGIN.top - 20}
                width={Math.max(2, layout.x(span.end) - layout.x(span.start))}
                height={bottom - MARGIN.top + 20}
                fill="currentColor"
                className={
                  isSelected
                    ? 'text-ink/[0.08]'
                    : isHovered
                      ? 'text-ink/[0.04]'
                      : 'text-transparent'
                }
              />
            )
          })}

          {/* Grid and axes. */}
          <g className="text-[11px]">
            {layout.yTicks.map((tick) => (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={layout.y(tick)}
                  y2={layout.y(tick)}
                  stroke="currentColor"
                  className="text-ink/10"
                />
                <text
                  x={MARGIN.left - 10}
                  y={layout.y(tick)}
                  dy="0.32em"
                  textAnchor="end"
                  fill="currentColor"
                  className="text-ink/65 tabular-nums"
                >
                  {formatAxisPrice(tick)}
                </text>
              </g>
            ))}
            <line
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={bottom}
              y2={bottom}
              stroke="currentColor"
              className="text-ink/25"
            />
            {layout.xTicks.map((tick) => (
              <text
                key={tick.index}
                x={layout.x(tick.index)}
                y={bottom + 18}
                textAnchor="middle"
                fill="currentColor"
                className="text-ink/65"
              >
                {tick.label}
              </text>
            ))}
          </g>

          {/* Period boundaries, flat levels and move sizes. */}
          {layout.spans.map((span) => {
            const left = layout.x(span.start)
            const right = layout.x(span.end)
            const { period } = span
            const isLabelled =
              period.shape !== 'flat' &&
              period.shape !== 'choppy' &&
              Math.abs(period.change) >= band / 2
            return (
              <g key={`marks-${period.startDate}`} pointerEvents="none">
                <line
                  x1={left}
                  x2={left}
                  y1={MARGIN.top - 20}
                  y2={bottom}
                  stroke="currentColor"
                  strokeDasharray="2 3"
                  className="text-ink/15"
                />
                {period.shape === 'flat' && period.level ? (
                  <>
                    <rect
                      x={left}
                      y={layout.y(period.high)}
                      width={Math.max(1, right - left)}
                      height={Math.max(
                        1,
                        layout.y(period.low) - layout.y(period.high),
                      )}
                      fill="currentColor"
                      className="text-ink/[0.06]"
                    />
                    <line
                      x1={left}
                      x2={right}
                      y1={layout.y(period.level)}
                      y2={layout.y(period.level)}
                      stroke="currentColor"
                      strokeWidth={2}
                      className="text-ink/45"
                    />
                  </>
                ) : null}
                {isLabelled ? (
                  <text
                    x={(left + right) / 2}
                    y={MARGIN.top - 8}
                    textAnchor="middle"
                    fill="currentColor"
                    className="text-[11px] font-medium text-ink/75 tabular-nums"
                  >
                    {formatPercent(period.change, {
                      digits: Math.abs(period.change) >= 0.1 ? 0 : 1,
                    })}
                  </text>
                ) : null}
              </g>
            )
          })}

          <path
            d={layout.path}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            className="text-ink/80"
            pointerEvents="none"
          />

          {isShowingCalls ? (
            <CallMarks markers={markers} layout={layout} />
          ) : null}

          {hover ? (
            <g pointerEvents="none">
              <line
                x1={layout.x(hover.index)}
                x2={layout.x(hover.index)}
                y1={MARGIN.top - 20}
                y2={bottom}
                stroke="currentColor"
                className="text-ink/40"
              />
              <circle
                cx={layout.x(hover.index)}
                cy={layout.y(points[hover.index].close)}
                r={4}
                fill="var(--color-ink)"
                stroke="var(--color-paper)"
                strokeWidth={2}
              />
            </g>
          ) : null}

          <rect
            x={MARGIN.left}
            y={MARGIN.top - 20}
            width={layout.innerWidth}
            height={bottom - MARGIN.top + 20}
            fill="transparent"
            className="cursor-pointer"
            onPointerMove={onPointerMove}
            onPointerLeave={() => setHover(null)}
            onClick={() => {
              const span = hover ? layout.spans[hover.span] : null
              if (span) {
                onSelect(periods.indexOf(span.period))
              }
            }}
          />
        </svg>
      ) : null}

      {layout && hover ? (
        <div
          className="pointer-events-none absolute top-1 z-10 w-max max-w-[16rem] rounded-md bg-paper px-3 py-2 text-[13px] shadow-sm ring-1 ring-ink/15"
          style={
            layout.x(hover.index) > width * 0.6
              ? { right: width - layout.x(hover.index) + 12 }
              : { left: layout.x(hover.index) + 12 }
          }
        >
          <p className="text-ink/65">
            {formatShortDate(points[hover.index].date)}
          </p>
          <p className="font-medium tabular-nums">
            {formatPrice(points[hover.index].close)}
          </p>
          {hovered ? (
            <p className="mt-1 text-ink/75">
              {describePeriod(hovered.period, band)}. Click to read this period.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function CallMarks({
  markers,
  layout,
}: {
  markers: ChartMarker[]
  layout: {
    x: (index: number) => number
    y: (price: number) => number
    indexByDate: Map<string, number>
  }
}) {
  return (
    <g pointerEvents="none">
      {markers.map((marker, position) => {
        const index = layout.indexByDate.get(marker.date)
        if (index === undefined) {
          return null
        }
        const cx = layout.x(index)
        const cy = layout.y(marker.price)
        const direction = ratingDirection(marker.rating)
        const common = {
          fill: RATING_COLORS[marker.rating],
          stroke: 'var(--color-paper)',
          strokeWidth: 1.5,
          paintOrder: 'stroke' as const,
        }
        if (direction === 0) {
          return <circle key={position} cx={cx} cy={cy} r={3.5} {...common} />
        }
        const tip = direction > 0 ? cy - 5 : cy + 5
        const base = direction > 0 ? cy + 4 : cy - 4
        return (
          <path
            key={position}
            d={`M${cx} ${tip} L${cx + 4.5} ${base} L${cx - 4.5} ${base} Z`}
            {...common}
          />
        )
      })}
    </g>
  )
}
