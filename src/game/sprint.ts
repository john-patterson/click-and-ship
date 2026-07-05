import {
  DEBT_GENERATOR_DEBT_PER_SPRINT,
  FLIGHT_RISK_QUIT_CHANCE,
  QUIT_TEAM_MORALE_PENALTY,
  REFACTOR_PROPOSAL_CHANCE,
  SOFT_PIP_FLIGHT_MORALE,
  SPRINTS_PER_QUARTER,
  TRAIT_FLIGHT_MORALE,
  TRAIT_LABELS,
  TRAIT_REVEAL_FLAVOR,
} from './constants'
import { effectiveTimeBudget, rollSprintEvent } from './events'
import { computeQuarterResult } from './quarter'
import { generateCandidate, takenNames } from './recruiting'
import { nextInt, nextRandom } from './rng'
import type { GameState, Report, SprintResult } from './save/schema'
import { clamp, hasTrait, isWorking, selectedActivityCost, teamBaseSp } from './team'

export { selectedActivityCost } from './team'

// A report is at risk of quitting when their personal morale is low and any
// flight-risk condition applies: the hidden trait, a soft PIP (one NI), or a
// denied promotion (until the next EE).
function isFlightRisk(report: Report): boolean {
  if (!isWorking(report)) return false
  if (hasTrait(report, 'flight-risk') && report.morale < TRAIT_FLIGHT_MORALE) return true
  if (report.onSoftPIP && report.morale < SOFT_PIP_FLIGHT_MORALE) return true
  if (report.promotionDenied && report.morale < TRAIT_FLIGHT_MORALE) return true
  return false
}

// Resolves the current sprint per the spec pseudocode, then advances to the
// next sprint (rolling its event) or into the end-of-quarter rating stage
// after sprint 6. Pure: all randomness threads through state.rngSeed. RNG
// call order is fixed (incident roll, morale jitter, per-report quit rolls,
// interview candidate, next sprint's event roll, referral candidate,
// refactor-proposal rolls) so a given save replays identically.
export function resolveSprint(state: GameState): GameState {
  const selected = new Set(state.selectedActivities)
  const event = state.currentEvent
  let seed = state.rngSeed
  const notices: string[] = []

  // Story points: sum of the roster's output (ramping hires at 50%, mentor
  // bonuses applied), then the spec's coverage penalties and multipliers.
  let sp = teamBaseSp(state.reports)
  if (!selected.has('planning')) sp *= 0.7
  if (!selected.has('product')) sp -= 4
  if (!selected.has('design')) sp -= 4
  if (!selected.has('unblock')) sp -= 6
  if (selected.has('debtwork')) sp -= 2
  if (event === 'sick') sp -= 3

  // Incidents
  const baseIncidents = Math.floor(state.techDebt / 15)
  const moraleIncident = state.morale < 40 ? 1 : 0
  let incidentRoll: number
  ;[incidentRoll, seed] = nextRandom(seed)
  const rngIncident = incidentRoll < 0.3 ? 1 : 0
  const stormIncident = event === 'storm' ? 2 : 0
  const incidents = baseIncidents + moraleIncident + rngIncident + stormIncident
  const incidentSpCost = selected.has('triage')
    ? Math.max(0, incidents - 2) * 2
    : incidents * 2
  sp -= incidentSpCost

  // Morale multiplier (0.5 to 1.2)
  const moraleMult = 0.5 + (state.morale / 100) * 0.7
  sp = Math.max(0, Math.round(sp * moraleMult))

  // Morale delta
  let moraleDelta = -2 // baseline grind
  moraleDelta += selected.has('ones') ? 4 : -10
  if (!selected.has('triage') && incidents > 0) moraleDelta -= 4
  if (!selected.has('planning')) moraleDelta -= 6
  if (event === 'offsite') moraleDelta += 6
  if (event === 'kudos') moraleDelta += 4
  let moraleJitter: number
  ;[moraleJitter, seed] = nextInt(seed, -2, 2)
  moraleDelta += moraleJitter

  // Tech debt delta
  let techDebtDelta = 5 // baseline growth
  if (!selected.has('reviews')) techDebtDelta += 8
  if (selected.has('debtwork')) techDebtDelta -= 8
  const debtGenerators = state.reports.filter(
    (r) => isWorking(r) && hasTrait(r, 'debt-generator'),
  ).length
  techDebtDelta += debtGenerators * DEBT_GENERATOR_DEBT_PER_SPRINT

  let morale = clamp(state.morale + moraleDelta, 0, 100)
  const techDebt = clamp(state.techDebt + techDebtDelta, 0, 100)

  // Personal morale tracks the team-wide delta.
  let reports: Report[] = state.reports.map((report) => ({
    ...report,
    morale: clamp(report.morale + moraleDelta, 0, 100),
  }))

  // Flight-risk quit rolls, in roster order so replays are stable.
  const survivors: Report[] = []
  let quits = 0
  for (const report of reports) {
    if (isFlightRisk(report)) {
      let quitRoll: number
      ;[quitRoll, seed] = nextRandom(seed)
      if (quitRoll < FLIGHT_RISK_QUIT_CHANCE) {
        quits += 1
        notices.push(`${report.name} quit. The team feels it.`)
        continue
      }
    }
    survivors.push(report)
  }
  if (quits > 0) {
    const quitPenalty = -QUIT_TEAM_MORALE_PENALTY * quits
    morale = clamp(morale + quitPenalty, 0, 100)
    reports = survivors.map((report) => ({
      ...report,
      morale: clamp(report.morale + quitPenalty, 0, 100),
    }))
  } else {
    reports = survivors
  }

  // A sprint of tenure for everyone still here; hidden traits reveal after
  // exactly one full worked sprint (tenure 1 -> 2).
  reports = reports.map((report) => {
    const sprintsWithTeam = report.sprintsWithTeam + 1
    if (sprintsWithTeam >= 2 && !report.traitsRevealed) {
      for (const trait of report.hiddenTraits) {
        notices.push(
          `You realize ${report.name} is a ${TRAIT_LABELS[trait]} — ${TRAIT_REVEAL_FLAVOR[trait]}.`,
        )
      }
      return { ...report, sprintsWithTeam, traitsRevealed: true }
    }
    return { ...report, sprintsWithTeam }
  })

  // Interviewing produces one candidate at sprint end.
  let candidatePool = state.candidatePool
  if (selected.has('interview')) {
    const taken = new Set([...reports.map((r) => r.name), ...candidatePool.map((c) => c.name)])
    let candidate
    ;[candidate, seed] = generateCandidate(seed, state.quarter, taken)
    candidatePool = [...candidatePool, candidate]
    notices.push(`${candidate.name} (${candidate.role}) entered your candidate pool.`)
  }

  const result: SprintResult = {
    quarter: state.quarter,
    sprint: state.sprint,
    event,
    activities: [...state.selectedActivities],
    sp,
    incidents,
    incidentSpCost,
    moraleDelta,
    techDebtDelta,
    moraleAfter: morale,
    techDebtAfter: techDebt,
  }

  const resolved: GameState = {
    ...state,
    morale,
    techDebt,
    reports,
    candidatePool,
    quarterSp: state.quarterSp + sp,
    quarterIncidents: state.quarterIncidents + incidents,
    totalSpRun: state.totalSpRun + sp,
    sprintHistory: [...state.sprintHistory, result],
    rngSeed: seed,
    committedHours: 0,
    pendingRefactor: null,
    notices,
  }

  if (state.sprint >= SPRINTS_PER_QUARTER) {
    // Quarter over: the player rates the team first; the boss review is
    // graded on the post-rating state. With nobody left to rate, skip
    // straight to the boss review.
    if (reports.length === 0) {
      return {
        ...resolved,
        phase: 'quarter-review',
        currentEvent: null,
        lastQuarterResult: computeQuarterResult(resolved),
      }
    }
    return { ...resolved, phase: 'rating', currentEvent: null }
  }

  // Advance to the next sprint and roll its event now, so the player sees it
  // while planning.
  let nextEvent
  ;[nextEvent, seed] = rollSprintEvent(seed)

  // A referral drops a Senior candidate straight into the pool.
  if (nextEvent === 'referral') {
    const taken = takenNames({ ...resolved, candidatePool })
    let candidate
    ;[candidate, seed] = generateCandidate(seed, state.quarter, taken, 'Senior')
    candidatePool = [...candidatePool, candidate]
  }

  // Refactor-addict seniors may pitch a pointless refactor for next sprint.
  let pendingRefactor: GameState['pendingRefactor'] = null
  for (const report of reports) {
    const chance = REFACTOR_PROPOSAL_CHANCE[report.role]
    if (!chance || !isWorking(report) || !hasTrait(report, 'refactor-addict')) continue
    let proposalRoll: number
    ;[proposalRoll, seed] = nextRandom(seed)
    if (pendingRefactor === null && proposalRoll < chance) {
      pendingRefactor = { reportId: report.id, reportName: report.name }
    }
  }

  // DESIGN NOTE: the activity selection carries over between sprints as a
  // convenience (most sprints look alike). If a CEO-demo event shrinks the
  // budget below the carried-over cost, the selection resets so the player
  // re-plans from scratch rather than starting over-budget.
  const carriedSelection =
    selectedActivityCost(state.selectedActivities, reports) <= effectiveTimeBudget(nextEvent)
      ? state.selectedActivities
      : []

  return {
    ...resolved,
    sprint: state.sprint + 1,
    currentEvent: nextEvent,
    selectedActivities: carriedSelection,
    candidatePool,
    pendingRefactor,
    rngSeed: seed,
  }
}
