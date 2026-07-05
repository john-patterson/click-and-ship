import type { ActivityId, Grade, SprintEventId } from './save/schema'

// All numbers in this file come from the build spec and are calibrated
// against paper simulation — do not change them without flagging.

export const SPRINTS_PER_QUARTER = 6
export const MAX_QUARTERS = 24

export const MANAGER_TIME_BUDGET = 40 // hours per sprint
export const TEAM_BASE_SP = 18

export const STARTING_MORALE = 70
export const STARTING_TECH_DEBT = 20

// DESIGN NOTE: the MVP roster is fixed (no hiring), so it lives here as
// static data instead of in save state. It moves into GameState when the
// Phase 2 hiring flow lands (which will need a schema bump anyway).
export interface TeamMemberDef {
  id: string
  name: string
  role: string
  spec: string | null
  baseSp: number
}

export const TEAM: readonly TeamMemberDef[] = [
  { id: 'alice', name: 'Alice', role: 'Junior', spec: null, baseSp: 3 },
  { id: 'bob', name: 'Bob', role: 'Junior', spec: null, baseSp: 3 },
  { id: 'carol', name: 'Carol', role: 'SWE II', spec: 'FE', baseSp: 5 },
  { id: 'dave', name: 'Dave', role: 'Senior', spec: 'BE', baseSp: 7 },
]

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
    selectedHint: 'No effect yet (hiring comes later)',
    skippedHint: 'No effect',
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
  { id: 'sick', label: 'Alice out sick', effectHint: '−3 SP this sprint' },
  { id: 'storm', label: 'Prod incident storm', effectHint: '+2 incidents this sprint' },
  { id: 'offsite', label: 'Team offsite went well', effectHint: '+6 morale' },
  { id: 'kudos', label: 'VP called out the team', effectHint: '+4 morale' },
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
