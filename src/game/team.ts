import {
  ACTIVITY_BY_ID,
  HIGH_MAINTENANCE_EXTRA_HOURS,
  MENTOR_JUNIOR_SP_BONUS,
} from './constants'
import type { ActivityId, GameState, Report, Trait } from './save/schema'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function hasTrait(report: Report, trait: Trait): boolean {
  return report.hiddenTraits.includes(trait)
}

// A report contributes (and their traits act) once they've actually joined:
// sprintsWithTeam 0 means "hired this sprint, starts next sprint".
export function isWorking(report: Report): boolean {
  return report.sprintsWithTeam >= 1
}

export function isRamping(report: Report): boolean {
  return report.sprintsWithTeam === 1
}

// Per-sprint 1:1 hours this report adds on top of the base 1:1 cost. Trait
// effects apply even before the reveal — the player just doesn't know why
// the number looks the way it does yet.
export function effectiveSalaryHours(report: Report): number {
  if (hasTrait(report, 'low-maintenance')) return 0
  return report.salaryHours + (hasTrait(report, 'high-maintenance') ? HIGH_MAINTENANCE_EXTRA_HOURS : 0)
}

// The 1:1 activity's cost grows with every raise and hire; everything else
// is flat.
export function activityCost(id: ActivityId, reports: readonly Report[]): number {
  const base = ACTIVITY_BY_ID[id].cost
  if (id !== 'ones') return base
  return base + reports.reduce((total, report) => total + effectiveSalaryHours(report), 0)
}

export function selectedActivityCost(
  activities: readonly ActivityId[],
  reports: readonly Report[],
): number {
  return activities.reduce((total, id) => total + activityCost(id, reports), 0)
}

// Team output before the sprint formula's multipliers: sum of each working
// report's SP, at 50% during their ramp-up sprint, with mentor bonuses for
// juniors. May be fractional; the sprint formula rounds at the end.
export function teamBaseSp(reports: readonly Report[]): number {
  const mentors = reports.filter((r) => isWorking(r) && hasTrait(r, 'mentor')).length
  let total = 0
  for (const report of reports) {
    if (!isWorking(report)) continue
    let sp = report.baseSp
    if (report.role === 'Junior') sp += mentors * MENTOR_JUNIOR_SP_BONUS
    if (isRamping(report)) sp *= 0.5
    total += sp
  }
  return total
}

// Applies a team-wide morale delta: the team stat moves, and every report's
// personal morale moves with it. Personal shocks (ratings, denials) are
// applied separately on top by their own code paths.
export function applyTeamMorale(state: GameState, delta: number): GameState {
  if (delta === 0) return state
  return {
    ...state,
    morale: clamp(state.morale + delta, 0, 100),
    reports: state.reports.map((report) => ({
      ...report,
      morale: clamp(report.morale + delta, 0, 100),
    })),
  }
}

export function getReport(state: GameState, reportId: string): Report | undefined {
  return state.reports.find((r) => r.id === reportId)
}

export function updateReport(
  state: GameState,
  reportId: string,
  update: (report: Report) => Report,
): GameState {
  return {
    ...state,
    reports: state.reports.map((report) => (report.id === reportId ? update(report) : report)),
  }
}
