import {
  GRADE_LADDER,
  GRADE_POINTS,
  MAX_QUARTERS,
  PIP_MORALE_PENALTY,
  PROMOTION_POINTS_REQUIRED,
} from './constants'
import type { GameState, Grade, QuarterOutcome, QuarterResult } from './save/schema'

function gradeIndex(grade: Grade): number {
  return GRADE_LADDER.indexOf(grade) // F=0, D=1, C=2, B=3, A=4, S=5
}

// Grades the quarter and decides what happens next (PIP transitions,
// promotion, firing, Q24 cap). Called right after sprint 6 resolves; nothing
// here mutates state — the decided outcome is applied by
// applyQuarterOutcome() when the player acknowledges the review.
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
// then either ends the run or starts the next quarter (with PIP transitions).
export function applyQuarterOutcome(state: GameState): GameState {
  const result = state.lastQuarterResult
  if (state.phase !== 'quarter-review' || !result) return state

  const booked: GameState = {
    ...state,
    careerPoints: result.careerPointsAfter,
    consecutiveDs: result.grade === 'D' ? state.consecutiveDs + 1 : 0,
    gradeHistory: [...state.gradeHistory, result.grade],
  }

  if (result.outcome === 'fired' || result.outcome === 'promoted' || result.outcome === 'capped') {
    return { ...booked, phase: 'run-over', runOverReason: result.outcome }
  }

  const startingPip = result.outcome === 'pip-start'
  // DESIGN NOTE: the spec's PIP "boss veto of one player action" is deferred
  // past MVP; only the morale penalty applies at PIP start.
  return {
    ...booked,
    quarter: state.quarter + 1,
    sprint: 1,
    morale: startingPip ? Math.max(0, state.morale - PIP_MORALE_PENALTY) : state.morale,
    onPip: startingPip ? true : result.outcome === 'pip-lifted' ? false : state.onPip,
    quarterSp: 0,
    quarterIncidents: 0,
    sprintHistory: [],
    currentEvent: null, // sprint 1 never has an event
    phase: 'planning',
  }
}
