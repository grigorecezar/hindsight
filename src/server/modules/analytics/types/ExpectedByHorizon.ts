import type { Horizon } from '../../outcomes/enums/Horizon'
import type { ExpectedOutcome } from './ExpectedOutcome'

export type ExpectedByHorizon = Partial<Record<Horizon, ExpectedOutcome>>
