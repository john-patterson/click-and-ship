import type { ActivityId, Grade, Role, SprintEventId, Tier, Trait } from './save/schema'

// All numbers in this file come from the build spec and are calibrated
// against paper simulation — do not change them without flagging.

export const SPRINTS_PER_QUARTER = 6
export const MAX_QUARTERS = 24

export const MANAGER_TIME_BUDGET = 40 // hours per sprint

export const STARTING_MORALE = 70
export const STARTING_TECH_DEBT = 20

export interface ActivityDef {
  id: ActivityId
  label: string
  cost: number // hours
  selectedHint: string
  skippedHint: string
}

export const ACTIVITIES: readonly ActivityDef[] = [
  {
    id: 'planning',
    label: 'Sprint planning',
    cost: 4,
    selectedHint: 'Team works at full output',
    skippedHint: 'Output ×0.7, morale −6',
  },
  {
    // Base cost; report salary hours (raises, hires) add on top — see
    // activityCost() in team.ts.
    id: 'ones',
    label: '1:1s with all reports',
    cost: 8,
    selectedHint: 'Morale +4',
    skippedHint: 'Morale −10',
  },
  {
    id: 'reviews',
    label: 'Code reviews',
    cost: 4,
    selectedHint: 'Tech debt grows at baseline',
    skippedHint: 'Tech debt +8',
  },
  {
    id: 'unblock',
    label: 'Unblock juniors',
    cost: 4,
    selectedHint: 'Juniors deliver in full',
    skippedHint: '−6 SP',
  },
  {
    id: 'product',
    label: 'Cover product gap',
    cost: 8,
    selectedHint: 'Product gap covered',
    skippedHint: '−4 SP',
  },
  {
    id: 'design',
    label: 'Cover design gap',
    cost: 8,
    selectedHint: 'Design gap covered',
    skippedHint: '−4 SP',
  },
  {
    id: 'triage',
    label: 'Incident triage',
    cost: 4,
    selectedHint: 'Absorbs the first 2 incidents',
    skippedHint: 'Incidents fully cost SP + morale',
  },
  {
    id: 'interview',
    label: 'Interview candidate',
    cost: 4,
    selectedHint: 'One new candidate joins the pool at sprint end',
    skippedHint: 'No new candidates',
  },
  {
    id: 'debtwork',
    label: 'Reliability project',
    cost: 4,
    selectedHint: 'Tech debt −8, SP −2 this sprint',
    skippedHint: 'Tech debt grows at baseline',
  },
]

export const ACTIVITY_BY_ID: Record<ActivityId, ActivityDef> = Object.fromEntries(
  ACTIVITIES.map((a) => [a.id, a]),
) as Record<ActivityId, ActivityDef>

export interface SprintEventDef {
  id: SprintEventId
  label: string
  effectHint: string
}

export const SPRINT_EVENTS: readonly SprintEventDef[] = [
  { id: 'ceo', label: 'CEO wants a demo', effectHint: 'Manager time −8h this sprint' },
  { id: 'sick', label: 'A dev is out sick', effectHint: '−3 SP this sprint' },
  { id: 'storm', label: 'Prod incident storm', effectHint: '+2 incidents this sprint' },
  { id: 'offsite', label: 'Team offsite went well', effectHint: '+6 morale' },
  { id: 'kudos', label: 'VP called out the team', effectHint: '+4 morale' },
  {
    id: 'referral',
    label: 'Dave referred a friend',
    effectHint: 'A Senior candidate joins the pool',
  },
]

export const EVENT_BY_ID: Record<SprintEventId, SprintEventDef> = Object.fromEntries(
  SPRINT_EVENTS.map((e) => [e.id, e]),
) as Record<SprintEventId, SprintEventDef>

export const CEO_EVENT_BUDGET_PENALTY = 8

// Quarter grade: score starts at 0, each threshold adjusts it, then
// grade = GRADE_LADDER[clamp(2 + score, 0, 5)].
export const GRADE_LADDER: readonly Grade[] = ['F', 'D', 'C', 'B', 'A', 'S']

export const GRADE_POINTS: Record<Grade, number> = {
  S: 3,
  A: 2,
  B: 1,
  C: 0,
  D: -1,
  F: -2,
}

export const PROMOTION_POINTS_REQUIRED = 6 // IC Manager -> Manager of Managers

export const PIP_MORALE_PENALTY = 10 // applied at the start of a PIP quarter

// --- Phase 2: quarterly reviews ---

export const RATING_EFFECTS = {
  EE: { personalMorale: 10, teamMorale: 5, loyalty: 1, salaryHours: 2 },
  ME: { personalMorale: 0, teamMorale: 0, loyalty: 0, salaryHours: 0 },
  NI: { personalMorale: -8, teamMorale: -3, loyalty: 0, salaryHours: 0 },
} as const

export const CALIBRATION_CHANCE = 0.15 // rare but memorable — do not raise

// A soft-PIP report (one NI) becomes a flight risk below this personal
// morale during the following quarter.
export const SOFT_PIP_FLIGHT_MORALE = 40
// A report with the flight-risk trait (or a denied promotion) is at risk
// below this personal morale.
export const TRAIT_FLIGHT_MORALE = 50
export const FLIGHT_RISK_QUIT_CHANCE = 0.3 // per sprint while at risk
export const QUIT_TEAM_MORALE_PENALTY = 10
export const AUTO_FIRE_TEAM_MORALE_PENALTY = 8 // two consecutive NIs

// --- Phase 2: recruiting ---

export const HEADCOUNT_CAP_IC = 6
export const HIRING_COST_HOURS = 4
// Candidates expire at the cleanup of the quarter after the one they were
// generated in ("they took another offer").
export const CANDIDATE_LIFETIME_QUARTERS = 2

export const CANDIDATE_ROLES: readonly Role[] = ['Junior', 'SWE II', 'Senior', 'Specialist']

export const ROLE_STATS: Record<Role, { baseSp: number; salaryHours: number }> = {
  Junior: { baseSp: 3, salaryHours: 1 },
  'SWE II': { baseSp: 5, salaryHours: 2 },
  Senior: { baseSp: 7, salaryHours: 3 },
  Specialist: { baseSp: 5, salaryHours: 2 },
  Staff: { baseSp: 7, salaryHours: 3 }, // promotion-only, never in the pool
}

export const GOOD_TRAITS: readonly Trait[] = [
  'mentor',
  'fast-learner',
  'team-player',
  'low-maintenance',
]
export const BAD_TRAITS: readonly Trait[] = [
  'refactor-addict',
  'flight-risk',
  'high-maintenance',
  'debt-generator',
]
export const ALL_TRAITS: readonly Trait[] = [...GOOD_TRAITS, ...BAD_TRAITS]

export const TRAIT_LABELS: Record<Trait, string> = {
  mentor: 'Mentor',
  'fast-learner': 'Fast learner',
  'team-player': 'Team player',
  'low-maintenance': 'Low maintenance',
  'refactor-addict': 'Refactor addict',
  'flight-risk': 'Flight risk',
  'high-maintenance': 'High maintenance',
  'debt-generator': 'Debt generator',
}

export const TRAIT_REVEAL_FLAVOR: Record<Trait, string> = {
  mentor: 'juniors have been picking up their habits',
  'fast-learner': 'they level up noticeably every quarter',
  'team-player': 'the whole room is lighter when they are around',
  'low-maintenance': 'their 1:1s run themselves',
  'refactor-addict': 'every design doc turns into a rewrite proposal',
  'flight-risk': 'a recruiter tab is always open on their laptop',
  'high-maintenance': 'their 1:1s keep running long',
  'debt-generator': 'their PRs ship fast and rot faster',
}

export const MENTOR_JUNIOR_SP_BONUS = 1 // per mentor, to each junior
export const FAST_LEARNER_SP_PER_QUARTER = 1
export const FAST_LEARNER_SP_CAP_OVER_ROLE = 3 // capped at role max +3
export const TEAM_PLAYER_MORALE_PER_QUARTER = 2
export const HIGH_MAINTENANCE_EXTRA_HOURS = 2
export const DEBT_GENERATOR_DEBT_PER_SPRINT = 2

// DESIGN NOTE: "proposes pointless refactors more often" has no baseline —
// non-addicts never propose one in this phase (technical projects are a
// later system). 25% per sprint for an addicted Senior, halved for Staff
// (Staff pitches are pointless half as often, per the Staff role blurb).
export const REFACTOR_PROPOSAL_CHANCE: Partial<Record<Role, number>> = {
  Senior: 0.25,
  Staff: 0.125,
}
export const REFACTOR_COST_HOURS = 4

// --- Phase 2: firing ---

export const FIRE_TEAM_MORALE_PENALTY = 8 // one-time, team-wide
export const FIRE_AFTERSHOCK_PERSONAL_MORALE = 3 // remaining reports, next sprint
export const POLITICAL_CAPITAL_START = 3

// --- Phase 2: report promotions ---

export const PROMO_EE_REQUIRED: Partial<Record<Role, number>> = {
  Junior: 2, // -> SWE II
  'SWE II': 2, // -> Senior
  Senior: 3, // -> Staff
}
export const PROMO_TARGET: Partial<Record<Role, Role>> = {
  Junior: 'SWE II',
  'SWE II': 'Senior',
  Senior: 'Staff',
}
// baseSP after promotion: 3->5, 5->7, 7->7 (Staff).
export const PROMO_BASE_SP: Partial<Record<Role, number>> = {
  'SWE II': 5,
  Senior: 7,
  Staff: 7,
}
export const PROMO_PREP_HOURS = 4 // charged against next quarter's sprint 1
export const PROMO_POLITICAL_CAPITAL_COST = 1
export const PROMO_SALARY_HOURS = 1
export const PROMO_LOYALTY = 2
export const PROMO_TEAM_MORALE = 3
export const PROMO_DENY_PERSONAL_MORALE = 10
export const DEFERRED_PROMOTIONS_BEFORE_QUIT = 2

// --- Phase 2: player promotion ---

export const TIER_ORDER: readonly Tier[] = ['IC', 'MoM', 'VP', 'CTO']
export const TIER_TITLES: Record<Tier, string> = {
  IC: 'IC Manager',
  MoM: 'Manager of Managers',
  VP: 'VP of Engineering',
  CTO: 'CTO',
}
export const LEGACY_POLITICAL_CAPITAL = 3
export const LEGACY_ALLY_LOYALTY = 2
