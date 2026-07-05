export const CURRENT_SAVE_VERSION = 4

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

export type SprintEventId = 'ceo' | 'sick' | 'storm' | 'offsite' | 'kudos' | 'referral'

export type Grade = 'F' | 'D' | 'C' | 'B' | 'A' | 'S'

export type Tier = 'IC' | 'MoM' | 'VP' | 'CTO'

export type Rating = 'EE' | 'ME' | 'NI'

export type Role = 'Junior' | 'SWE II' | 'Senior' | 'Staff' | 'Specialist'

export type Spec = null | 'Product' | 'Design' | 'FE' | 'BE'

export type Trait =
  | 'mentor'
  | 'fast-learner'
  | 'team-player'
  | 'low-maintenance'
  | 'refactor-addict'
  | 'flight-risk'
  | 'high-maintenance'
  | 'debt-generator'

// The end-of-quarter sequence is a phase machine: sprint 6 resolves into
// 'rating', which flows through 'calibration' (only when the override fires)
// into 'quarter-review' (boss grade), then 'promotions' (per-report decision
// queue, only when someone is eligible) or 'ceremony' (player promotion),
// and finally back to 'planning' for the next quarter.
export type RunPhase =
  | 'planning'
  | 'rating'
  | 'calibration'
  | 'quarter-review'
  | 'promotions'
  | 'ceremony'
  | 'run-over'

export type RunOverReason = 'promoted' | 'fired' | 'capped' | 'retired'

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

export interface RatingEntry {
  quarter: number
  rating: Rating
}

export interface Report {
  id: string
  name: string
  role: Role
  spec: Spec
  baseSp: number
  // Personal morale, 0..100. Tracks every team-wide morale delta and
  // additionally takes personal shocks (ratings, denied promotions). Flight
  // risk checks read this, not team morale.
  morale: number
  ratingHistory: RatingEntry[]
  consecutiveNI: number
  loyalty: number
  // Extra per-sprint 1:1 hours this person adds on top of the base 1:1
  // activity cost (from raises and, for hires, their role's ongoing cost).
  salaryHours: number
  hiddenTraits: Trait[]
  traitsRevealed: boolean
  onSoftPIP: boolean
  deferredPromotions: number
  // Set when a promotion is denied; acts as a flight-risk flag until the
  // report earns another EE.
  promotionDenied: boolean
  timesPromoted: number
  // Quarter of the last approved promotion; EE ratings up to and including
  // this quarter don't count toward the next promotion.
  lastPromotedQuarter: number
  // Sprints resolved since hire. 0 = hired this sprint (not contributing
  // yet), 1 = ramping at 50%, 2+ = full capacity. Traits reveal when this
  // reaches 2 (exactly one full worked sprint after joining).
  sprintsWithTeam: number
}

export interface Candidate {
  id: string
  name: string
  role: Role // 'Staff' never appears in the candidate pool
  spec: Spec
  baseSp: number
  salaryHours: number // ongoing per-sprint 1:1 cost once hired
  hiringCost: number // one-time manager hours to hire
  hiddenTraits: Trait[] // 1-2 traits, revealed 1 sprint after hiring
  // Candidate is removed at the end-of-quarter cleanup of this quarter
  // ("they took another offer").
  expiresAtEndOfQuarter: number
}

export interface CalibrationEvent {
  direction: 'down' | 'up' // EE bumped down to ME, or ME bumped up to NI
  reportId: string
  reportName: string
}

export type LegacyPickId = 'ally' | 'capital' | 'reputation'

export interface MetaProgression {
  peakTier: Tier
  careerCount: number
}

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
  tier: Tier
  morale: number // 0..100 team morale
  techDebt: number // 0..100
  careerPoints: number
  // DESIGN NOTE: political capital's full spec is Phase 3. For this phase it
  // starts at 3, is spent by without-cause firings and promotion approvals,
  // and reaching 0 blocks further without-cause firings.
  politicalCapital: number
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

  // Roster and recruiting
  reports: Report[]
  candidatePool: Candidate[]
  // Manager hours already committed this sprint outside the activity list
  // (hires, accepted refactors); they shrink the planning budget.
  committedHours: number
  // Hours committed against the *next* quarter's first sprint (promo prep).
  pendingCommittedHours: number
  // A pointless refactor proposed by a refactor-addict senior; accepting
  // costs hours and does nothing.
  pendingRefactor: { reportId: string; reportName: string } | null

  // End-of-quarter review flow
  calibrationEvent: CalibrationEvent | null
  promotionQueue: string[] // report ids awaiting a promotion decision

  // Player promotion / career
  legacyPicks: LegacyPickId[]
  // First quarter at a new tier gets +1 boss grade score (legacy pick).
  reputationBoost: boolean
  // Report kept as an ally through the last promotion (legacy pick).
  allyReportId: string | null
  metaProgression: MetaProgression

  // Transient messages (trait reveals, quits, auto-fires) shown until the
  // next sprint resolves.
  notices: string[]
}

export interface SaveFileV4 {
  version: 4
  state: GameState
  lastSaveTimestamp: number
}

// Union this with SaveFileV5, etc. as the schema evolves.
export type SaveFile = SaveFileV4

interface StartingReportDef {
  id: string
  name: string
  role: Role
  spec: Spec
  baseSp: number
}

// The Phase 1 fixed roster, now the starting roster of every run. Their
// ongoing 1:1 cost is baked into the base 8h 1:1 activity (salaryHours 0);
// only raises and new hires add on top — this keeps the Phase 1 time-budget
// calibration intact.
const STARTING_ROSTER: readonly StartingReportDef[] = [
  { id: 'alice', name: 'Alice', role: 'Junior', spec: null, baseSp: 3 },
  { id: 'bob', name: 'Bob', role: 'Junior', spec: null, baseSp: 3 },
  { id: 'carol', name: 'Carol', role: 'SWE II', spec: 'FE', baseSp: 5 },
  { id: 'dave', name: 'Dave', role: 'Senior', spec: 'BE', baseSp: 7 },
]

export function createStartingReports(morale: number): Report[] {
  return STARTING_ROSTER.map((def) => ({
    ...def,
    morale,
    ratingHistory: [],
    consecutiveNI: 0,
    loyalty: 0,
    salaryHours: 0,
    hiddenTraits: [],
    traitsRevealed: true, // veterans: nothing left to discover
    onSoftPIP: false,
    deferredPromotions: 0,
    promotionDenied: false,
    timesPromoted: 0,
    lastPromotedQuarter: 0,
    sprintsWithTeam: 2, // past ramp-up
  }))
}

export function createInitialGameState(
  runNumber = 1,
  rngSeed?: number,
  metaProgression?: MetaProgression,
): GameState {
  return {
    quarter: 1,
    sprint: 1,
    tier: 'IC',
    morale: 70,
    techDebt: 20,
    careerPoints: 0,
    politicalCapital: 3,
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
    reports: createStartingReports(70),
    candidatePool: [],
    committedHours: 0,
    pendingCommittedHours: 0,
    pendingRefactor: null,
    calibrationEvent: null,
    promotionQueue: [],
    legacyPicks: [],
    reputationBoost: false,
    allyReportId: null,
    metaProgression: metaProgression ?? { peakTier: 'IC', careerCount: runNumber },
    notices: [],
  }
}
