export const CURRENT_SAVE_VERSION = 3

export type ActivityId =
  | 'planning'
  | 'ones'
  | 'reviews'
  | 'unblock'
  | 'product'
  | 'design'
  | 'triage'
  | 'interview'
  | 'debtwork'

export type SprintEventId = 'ceo' | 'sick' | 'storm' | 'offsite' | 'kudos'

export type Grade = 'F' | 'D' | 'C' | 'B' | 'A' | 'S'

export type RunPhase = 'planning' | 'quarter-review' | 'run-over'

export type RunOverReason = 'promoted' | 'fired' | 'capped'

// What happens after a quarter review is acknowledged. 'warning' is a plain
// continue with a "shape up" message (single D outside PIP).
export type QuarterOutcome =
  | 'continue'
  | 'warning'
  | 'pip-start'
  | 'pip-lifted'
  | 'fired'
  | 'promoted'
  | 'capped'

// The full breakdown of one resolved sprint, kept for the results panel and
// the quarter-review screen.
export interface SprintResult {
  quarter: number
  sprint: number
  event: SprintEventId | null
  activities: ActivityId[]
  sp: number
  incidents: number
  incidentSpCost: number
  moraleDelta: number
  techDebtDelta: number
  moraleAfter: number
  techDebtAfter: number
}

export interface QuarterResult {
  quarter: number
  totalSp: number
  incidents: number
  endMorale: number
  endTechDebt: number
  score: number
  grade: Grade
  // Human-readable score breakdown lines, e.g. "Total SP 112 (>=105): +1".
  reasons: string[]
  // Points from the grade table; 0 if the quarter was under PIP.
  pointsEarned: number
  careerPointsAfter: number
  onPipDuringQuarter: boolean
  outcome: QuarterOutcome
}

export interface GameState {
  quarter: number // 1-based, hard-capped at Q24
  sprint: number // 1..6 within the quarter
  morale: number // 0..100
  techDebt: number // 0..100
  careerPoints: number
  selectedActivities: ActivityId[]
  currentEvent: SprintEventId | null // rolled at the start of sprints 2-6
  quarterSp: number
  quarterIncidents: number
  sprintHistory: SprintResult[] // resolved sprints of the current quarter
  lastQuarterResult: QuarterResult | null
  onPip: boolean
  consecutiveDs: number
  gradeHistory: Grade[] // one entry per completed quarter, for run summaries
  totalSpRun: number // cumulative SP across the whole run
  rngSeed: number
  phase: RunPhase
  runOverReason: RunOverReason | null
  runNumber: number
}

export interface SaveFileV3 {
  version: 3
  state: GameState
  lastSaveTimestamp: number
}

// Union this with SaveFileV4, etc. as the schema evolves.
export type SaveFile = SaveFileV3

export function createInitialGameState(runNumber = 1, rngSeed?: number): GameState {
  return {
    quarter: 1,
    sprint: 1,
    morale: 70,
    techDebt: 20,
    careerPoints: 0,
    selectedActivities: [],
    currentEvent: null, // sprint 1 never has an event
    quarterSp: 0,
    quarterIncidents: 0,
    sprintHistory: [],
    lastQuarterResult: null,
    onPip: false,
    consecutiveDs: 0,
    gradeHistory: [],
    totalSpRun: 0,
    rngSeed: rngSeed ?? Date.now() >>> 0,
    phase: 'planning',
    runOverReason: null,
    runNumber,
  }
}
