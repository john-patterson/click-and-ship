import {
  AUTO_FIRE_TEAM_MORALE_PENALTY,
  FAST_LEARNER_SP_CAP_OVER_ROLE,
  FAST_LEARNER_SP_PER_QUARTER,
  GRADE_LADDER,
  GRADE_POINTS,
  MAX_QUARTERS,
  PIP_MORALE_PENALTY,
  PROMOTION_POINTS_REQUIRED,
  ROLE_STATS,
  TEAM_PLAYER_MORALE_PER_QUARTER,
} from './constants'
import { effectiveTimeBudget } from './events'
import { buildPromotionQueue, raisePeakTier } from './promotion'
import { expireCandidates } from './recruiting'
import type { GameState, Grade, QuarterOutcome, QuarterResult } from './save/schema'
import { applyTeamMorale, hasTrait, isWorking, selectedActivityCost } from './team'

function gradeIndex(grade: Grade): number {
  return GRADE_LADDER.indexOf(grade) // F=0, D=1, C=2, B=3, A=4, S=5
}

// Grades the quarter and decides what happens next (PIP transitions,
// promotion, firing, Q24 cap). Called after the rating/calibration stage
// applies its morale effects; nothing here mutates state — the decided
// outcome is applied by applyQuarterOutcome() when the player acknowledges
// the review.
export function computeQuarterResult(state: GameState): QuarterResult {
  const totalSp = state.quarterSp
  const incidents = state.quarterIncidents
  const reasons: string[] = []
  let score = 0

  if (totalSp >= 130) {
    score += 2
    reasons.push(`Total SP ${totalSp} (130+): +2`)
  } else if (totalSp >= 105) {
    score += 1
    reasons.push(`Total SP ${totalSp} (105+): +1`)
  } else if (totalSp >= 80) {
    reasons.push(`Total SP ${totalSp} (80+): +0`)
  } else if (totalSp >= 55) {
    score -= 1
    reasons.push(`Total SP ${totalSp} (below 80): -1`)
  } else {
    score -= 2
    reasons.push(`Total SP ${totalSp} (below 55): -2`)
  }

  if (state.morale >= 75) {
    score += 1
    reasons.push(`Morale ${state.morale} (75+): +1`)
  } else if (state.morale < 40) {
    score -= 1
    reasons.push(`Morale ${state.morale} (below 40): -1`)
  }

  if (state.techDebt < 25) {
    score += 1
    reasons.push(`Tech debt ${state.techDebt} (below 25): +1`)
  } else if (state.techDebt > 60) {
    score -= 1
    reasons.push(`Tech debt ${state.techDebt} (above 60): -1`)
  }

  if (incidents > 14) {
    score -= 1
    reasons.push(`${incidents} incidents (above 14): -1`)
  }

  if (state.reputationBoost) {
    // Legacy pick: the first quarter at a new tier gets +1.
    score += 1
    reasons.push('Reputation from your promotion: +1')
  }

  const grade = GRADE_LADDER[Math.min(5, Math.max(0, 2 + score))]

  const pointsEarned = state.onPip ? 0 : GRADE_POINTS[grade]
  if (state.onPip) reasons.push('On PIP: no career points this quarter')

  // DESIGN NOTE: career points floor at 0. The spec assigns -1/-2 points to
  // D/F but doesn't say whether the total can go negative; failure is
  // already punished by the PIP -> fired machine, so digging an unbounded
  // points hole on top of that felt redundant.
  const careerPointsAfter = Math.max(0, state.careerPoints + pointsEarned)

  const consecutiveDs = grade === 'D' ? state.consecutiveDs + 1 : 0

  let outcome: QuarterOutcome
  if (state.onPip && gradeIndex(grade) <= gradeIndex('C')) {
    outcome = 'fired'
  } else if (careerPointsAfter >= PROMOTION_POINTS_REQUIRED) {
    outcome = 'promoted'
  } else if (state.quarter >= MAX_QUARTERS) {
    outcome = 'capped'
  } else if (state.onPip) {
    outcome = 'pip-lifted' // survived with B or better
  } else if (grade === 'F' || consecutiveDs >= 2) {
    outcome = 'pip-start'
  } else if (grade === 'D') {
    outcome = 'warning'
  } else {
    outcome = 'continue'
  }

  return {
    quarter: state.quarter,
    totalSp,
    incidents,
    endMorale: state.morale,
    endTechDebt: state.techDebt,
    score,
    grade,
    reasons,
    pointsEarned,
    careerPointsAfter,
    onPipDuringQuarter: state.onPip,
    outcome,
  }
}

// Applies the outcome decided at quarter end: books the grade and points,
// then ends the run, opens the promotion ceremony, queues report-promotion
// decisions, or wraps the quarter up directly.
export function applyQuarterOutcome(state: GameState): GameState {
  const result = state.lastQuarterResult
  if (state.phase !== 'quarter-review' || !result) return state

  const booked: GameState = {
    ...state,
    careerPoints: result.careerPointsAfter,
    consecutiveDs: result.grade === 'D' ? state.consecutiveDs + 1 : 0,
    gradeHistory: [...state.gradeHistory, result.grade],
  }

  if (result.outcome === 'fired' || result.outcome === 'capped') {
    return {
      ...booked,
      phase: 'run-over',
      runOverReason: result.outcome,
      metaProgression: raisePeakTier(state.metaProgression, state.tier),
    }
  }

  if (result.outcome === 'promoted') {
    // The ceremony (legacy pick) handles the tier change; report promotions
    // and recruiting cleanup are moot — this roster is left behind.
    return { ...booked, phase: 'ceremony' }
  }

  const promotionQueue = buildPromotionQueue(booked)
  if (promotionQueue.length > 0) {
    return { ...booked, phase: 'promotions', promotionQueue }
  }

  return finishQuarter(booked)
}

// The tail of the end-of-quarter sequence, after report promotions resolve:
// quarter-cadence trait effects, consecutive-NI auto-fires, candidate
// expiry, PIP transitions, and the jump into next quarter's sprint 1.
export function finishQuarter(state: GameState): GameState {
  const result = state.lastQuarterResult
  if (!result) return state

  let next = state
  const notices: string[] = [...state.notices]

  // Quarter-cadence traits.
  const teamPlayers = next.reports.filter(
    (r) => isWorking(r) && hasTrait(r, 'team-player'),
  ).length
  if (teamPlayers > 0) {
    next = applyTeamMorale(next, teamPlayers * TEAM_PLAYER_MORALE_PER_QUARTER)
  }
  next = {
    ...next,
    reports: next.reports.map((report) => {
      if (!isWorking(report) || !hasTrait(report, 'fast-learner')) return report
      const cap = ROLE_STATS[report.role].baseSp + FAST_LEARNER_SP_CAP_OVER_ROLE
      return { ...report, baseSp: Math.min(report.baseSp + FAST_LEARNER_SP_PER_QUARTER, cap) }
    }),
  }

  // Two consecutive NIs -> auto-fire at the start of the next quarter.
  const autoFired = next.reports.filter((r) => r.consecutiveNI >= 2)
  for (const report of autoFired) {
    notices.push(`${report.name} was let go after a second consecutive NI.`)
  }
  if (autoFired.length > 0) {
    next = {
      ...next,
      reports: next.reports.filter((r) => r.consecutiveNI < 2),
    }
    next = applyTeamMorale(next, -AUTO_FIRE_TEAM_MORALE_PENALTY * autoFired.length)
  }

  // Recruiting cleanup: stale candidates took other offers.
  const keptCandidates = expireCandidates(next.candidatePool, state.quarter)
  const expiredCount = next.candidatePool.length - keptCandidates.length
  if (expiredCount > 0) {
    notices.push(
      expiredCount === 1
        ? 'A candidate took another offer.'
        : `${expiredCount} candidates took other offers.`,
    )
  }

  const startingPip = result.outcome === 'pip-start'
  // DESIGN NOTE: the spec's PIP "boss veto of one player action" is deferred
  // past MVP; only the morale penalty applies at PIP start.
  if (startingPip) next = applyTeamMorale(next, -PIP_MORALE_PENALTY)

  // Promo case prep booked during the promotion decisions eats into the new
  // quarter's first sprint.
  const committedHours = state.pendingCommittedHours
  const carriedSelection =
    selectedActivityCost(state.selectedActivities, next.reports) + committedHours <=
    effectiveTimeBudget(null)
      ? state.selectedActivities
      : []

  return {
    ...next,
    quarter: state.quarter + 1,
    sprint: 1,
    onPip: startingPip ? true : result.outcome === 'pip-lifted' ? false : state.onPip,
    quarterSp: 0,
    quarterIncidents: 0,
    sprintHistory: [],
    currentEvent: null, // sprint 1 never has an event
    selectedActivities: carriedSelection,
    candidatePool: keptCandidates,
    committedHours,
    pendingCommittedHours: 0,
    pendingRefactor: null,
    calibrationEvent: null,
    promotionQueue: [],
    reputationBoost: false, // consumed by the grade this quarter (if set)
    notices,
    phase: 'planning',
  }
}
