import {
  ALL_TRAITS,
  CANDIDATE_LIFETIME_QUARTERS,
  CANDIDATE_ROLES,
  FIRE_AFTERSHOCK_PERSONAL_MORALE,
  FIRE_TEAM_MORALE_PENALTY,
  HEADCOUNT_CAP_IC,
  ROLE_STATS,
} from './constants'
import { effectiveTimeBudget } from './events'
import { nextInt, nextRandom } from './rng'
import type { Candidate, GameState, Report, Role, Spec, Trait } from './save/schema'
import { applyTeamMorale, clamp, selectedActivityCost } from './team'

const CANDIDATE_NAMES = [
  'Erin', 'Felix', 'Grace', 'Hiro', 'Imani', 'Jonas', 'Kira', 'Leo',
  'Mara', 'Nikhil', 'Oona', 'Pavel', 'Quinn', 'Rosa', 'Sam', 'Tessa',
  'Umar', 'Vera', 'Wes', 'Xia', 'Yusuf', 'Zoe', 'Aditi', 'Bruno',
  'Celine', 'Dmitri', 'Elena', 'Farid', 'Gwen', 'Hank', 'Ines', 'Jules',
  'Kenji', 'Lena', 'Milo', 'Nadia', 'Otis', 'Priya', 'Rami', 'Suki',
] as const

function rollName(seed: number, taken: ReadonlySet<string>): [string, number] {
  let index: number
  ;[index, seed] = nextInt(seed, 0, CANDIDATE_NAMES.length - 1)
  // Linear probe past names already on the roster or in the pool; if every
  // name is somehow taken, reuse — collisions are cosmetic.
  for (let step = 0; step < CANDIDATE_NAMES.length; step += 1) {
    const name = CANDIDATE_NAMES[(index + step) % CANDIDATE_NAMES.length]
    if (!taken.has(name)) return [name, seed]
  }
  return [CANDIDATE_NAMES[index], seed]
}

function rollSpec(seed: number, role: Role): [Spec, number] {
  if (role === 'Junior') return [null, seed]
  if (role === 'Specialist') {
    const specs: Spec[] = ['Product', 'Design', 'FE', 'BE']
    const [index, next] = nextInt(seed, 0, specs.length - 1)
    return [specs[index], next]
  }
  const [coin, next] = nextRandom(seed)
  return [coin < 0.5 ? 'FE' : 'BE', next]
}

function rollTraits(seed: number): [Trait[], number] {
  let countRoll: number
  ;[countRoll, seed] = nextRandom(seed)
  const count = countRoll < 0.5 ? 1 : 2
  const traits: Trait[] = []
  while (traits.length < count) {
    let index: number
    ;[index, seed] = nextInt(seed, 0, ALL_TRAITS.length - 1)
    const trait = ALL_TRAITS[index]
    if (!traits.includes(trait)) traits.push(trait)
  }
  return [traits, seed]
}

// Rolls one candidate. Uniform over the four hireable roles unless a role is
// forced (the referral event always produces a Senior).
export function generateCandidate(
  seed: number,
  quarter: number,
  takenNames: ReadonlySet<string>,
  forcedRole?: Role,
): [Candidate, number] {
  let role = forcedRole
  if (!role) {
    let index: number
    ;[index, seed] = nextInt(seed, 0, CANDIDATE_ROLES.length - 1)
    role = CANDIDATE_ROLES[index]
  }
  let name: string
  ;[name, seed] = rollName(seed, takenNames)
  let spec: Spec
  ;[spec, seed] = rollSpec(seed, role)
  let traits: Trait[]
  ;[traits, seed] = rollTraits(seed)
  const stats = ROLE_STATS[role]
  return [
    {
      // The post-roll seed is unique at every generation point of a run, so
      // it doubles as a deterministic id.
      id: `cand-${seed.toString(36)}`,
      name,
      role,
      spec,
      baseSp: stats.baseSp,
      salaryHours: stats.salaryHours,
      hiringCost: 4,
      hiddenTraits: traits,
      expiresAtEndOfQuarter: quarter + CANDIDATE_LIFETIME_QUARTERS - 1,
    },
    seed,
  ]
}

export function takenNames(state: GameState): Set<string> {
  return new Set([
    ...state.reports.map((r) => r.name),
    ...state.candidatePool.map((c) => c.name),
  ])
}

// End-of-quarter cleanup: candidates whose second quarter in the pool just
// ended took another offer.
export function expireCandidates(pool: readonly Candidate[], quarterJustEnded: number): Candidate[] {
  return pool.filter((candidate) => candidate.expiresAtEndOfQuarter > quarterJustEnded)
}

export function atHeadcountCap(state: GameState): boolean {
  // Only the IC tier is playable in this phase; its cap is 6 reports.
  return state.reports.length >= HEADCOUNT_CAP_IC
}

// Named action 'recruit:hire'. Spends the one-time hiring hours this sprint;
// the hire joins next sprint at 50% capacity, traits still hidden.
export function hireCandidate(state: GameState, candidateId: string): GameState {
  if (state.phase !== 'planning') return state
  const candidate = state.candidatePool.find((c) => c.id === candidateId)
  if (!candidate) return state
  if (atHeadcountCap(state)) return state

  const hoursUsed =
    selectedActivityCost(state.selectedActivities, state.reports) + state.committedHours
  if (hoursUsed + candidate.hiringCost > effectiveTimeBudget(state.currentEvent)) return state

  const report: Report = {
    id: candidate.id.replace(/^cand-/, 'hire-'),
    name: candidate.name,
    role: candidate.role,
    spec: candidate.spec,
    baseSp: candidate.baseSp,
    morale: state.morale,
    ratingHistory: [],
    consecutiveNI: 0,
    loyalty: 0,
    salaryHours: candidate.salaryHours,
    hiddenTraits: candidate.hiddenTraits,
    traitsRevealed: false,
    onSoftPIP: false,
    deferredPromotions: 0,
    promotionDenied: false,
    timesPromoted: 0,
    lastPromotedQuarter: 0,
    sprintsWithTeam: 0,
  }

  return {
    ...state,
    reports: [...state.reports, report],
    candidatePool: state.candidatePool.filter((c) => c.id !== candidateId),
    committedHours: state.committedHours + candidate.hiringCost,
  }
}

// Named action 'team:fire'. Free in hours; costs 1 political capital when the
// report isn't on a soft PIP (firing without cause), blocked at 0 capital.
export function fireReport(state: GameState, reportId: string): GameState {
  if (state.phase !== 'planning') return state
  const report = state.reports.find((r) => r.id === reportId)
  if (!report) return state

  const withoutCause = !report.onSoftPIP
  if (withoutCause && state.politicalCapital <= 0) return state

  let next: GameState = {
    ...state,
    reports: state.reports.filter((r) => r.id !== reportId),
    politicalCapital: state.politicalCapital - (withoutCause ? 1 : 0),
    notices: [...state.notices, `You let ${report.name} go.`],
  }
  next = applyTeamMorale(next, -FIRE_TEAM_MORALE_PENALTY)
  // DESIGN NOTE: the spec's aftershock is "-3 morale for one sprint" on the
  // survivors; it's applied as a one-time personal-morale hit instead of a
  // temporary modifier to keep report state flat.
  return {
    ...next,
    reports: next.reports.map((r) => ({
      ...r,
      morale: clamp(r.morale - FIRE_AFTERSHOCK_PERSONAL_MORALE, 0, 100),
    })),
  }
}
