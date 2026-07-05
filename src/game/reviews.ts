import { CALIBRATION_CHANCE, RATING_EFFECTS } from './constants'
import { computeQuarterResult } from './quarter'
import { nextInt, nextRandom } from './rng'
import type { GameState, Rating, Report } from './save/schema'
import { clamp } from './team'

export interface RatingQuotas {
  nEE: number
  nME: number
  nNI: number
}

// Reports already on a soft PIP (one prior NI) sit outside the curve: they
// get NI automatically and don't count toward the quotas.
export function curvedReports(state: GameState): Report[] {
  return state.reports.filter((report) => !report.onSoftPIP)
}

// Forced-curve quotas for N curved reports: nNI = nEE = max(1, floor(N/5)),
// the rest ME. Team of 4 -> 1 NI + 1 EE + 2 ME.
export function ratingQuotas(n: number): RatingQuotas {
  if (n <= 0) return { nEE: 0, nME: 0, nNI: 0 }
  const nNI = Math.min(Math.max(1, Math.floor(n / 5)), n)
  // DESIGN NOTE: with a single curved report the spec quotas (1 NI + 1 EE)
  // can't both fit; the NI slot wins, since the curve exists to force pain.
  const nEE = Math.min(Math.max(1, Math.floor(n / 5)), n - nNI)
  return { nEE, nNI, nME: n - nNI - nEE }
}

// Returns null when the submission meets the forced curve exactly, else a
// human-readable reason. The UI disables submission on any error; the
// reducer also rejects, to guard imported saves.
export function validateRatings(
  state: GameState,
  ratings: Record<string, Rating>,
): string | null {
  const curved = curvedReports(state)
  const quotas = ratingQuotas(curved.length)
  let nEE = 0
  let nME = 0
  let nNI = 0
  for (const report of curved) {
    const rating = ratings[report.id]
    if (!rating) return `${report.name} has no rating`
    if (rating === 'EE') nEE += 1
    else if (rating === 'ME') nME += 1
    else nNI += 1
  }
  if (nEE !== quotas.nEE || nME !== quotas.nME || nNI !== quotas.nNI) {
    return `Curve not met: need ${quotas.nEE} EE / ${quotas.nME} ME / ${quotas.nNI} NI`
  }
  return null
}

function applyRatingToReport(report: Report, rating: Rating, quarter: number): Report {
  const effects = RATING_EFFECTS[rating]
  return {
    ...report,
    morale: clamp(report.morale + effects.personalMorale, 0, 100),
    loyalty: report.loyalty + effects.loyalty,
    salaryHours: report.salaryHours + effects.salaryHours,
    ratingHistory: [...report.ratingHistory, { quarter, rating }],
    consecutiveNI: rating === 'NI' ? report.consecutiveNI + 1 : 0,
    onSoftPIP: rating === 'NI',
    // An EE clears the flight-risk flag from a denied promotion.
    promotionDenied: rating === 'EE' ? false : report.promotionDenied,
  }
}

// Reverses the just-applied EE effects and rewrites the history entry to ME
// ("we can't meet the raise budget this cycle").
function bumpDownToME(report: Report): Report {
  const effects = RATING_EFFECTS.EE
  return {
    ...report,
    morale: clamp(report.morale - effects.personalMorale, 0, 100),
    loyalty: report.loyalty - effects.loyalty,
    salaryHours: report.salaryHours - effects.salaryHours,
    ratingHistory: report.ratingHistory.map((entry, i) =>
      i === report.ratingHistory.length - 1 ? { ...entry, rating: 'ME' as const } : entry,
    ),
  }
}

// Rewrites the just-applied ME into a full NI ("cross-team calibration
// adjusted this rating").
function bumpUpToNI(report: Report): Report {
  const effects = RATING_EFFECTS.NI
  return {
    ...report,
    morale: clamp(report.morale + effects.personalMorale, 0, 100),
    ratingHistory: report.ratingHistory.map((entry, i) =>
      i === report.ratingHistory.length - 1 ? { ...entry, rating: 'NI' as const } : entry,
    ),
    consecutiveNI: report.consecutiveNI + 1,
    onSoftPIP: true,
  }
}

// Named action 'review:rate'. Applies the forced-curve ratings, rolls the
// calibration override, and grades the quarter on the post-rating state.
export function submitRatings(state: GameState, ratings: Record<string, Rating>): GameState {
  if (state.phase !== 'rating') return state
  if (validateRatings(state, ratings) !== null) return state

  let seed = state.rngSeed
  let teamMoraleDelta = 0

  const finalRating = (report: Report): Rating => (report.onSoftPIP ? 'NI' : ratings[report.id])

  let reports = state.reports.map((report) => {
    const rating = finalRating(report)
    teamMoraleDelta += RATING_EFFECTS[rating].teamMorale
    return applyRatingToReport(report, rating, state.quarter)
  })

  // Calibration override: one roll, 15%, 50/50 direction. Soft-PIP auto-NIs
  // are not part of the curve, so they can't be picked in either direction.
  let calibrationEvent: GameState['calibrationEvent'] = null
  let calibrationRoll: number
  ;[calibrationRoll, seed] = nextRandom(seed)
  if (calibrationRoll < CALIBRATION_CHANCE) {
    let directionRoll: number
    ;[directionRoll, seed] = nextRandom(seed)
    const direction = directionRoll < 0.5 ? 'down' : 'up'
    const fromRating: Rating = direction === 'down' ? 'EE' : 'ME'
    const targets = state.reports.filter(
      (report) => !report.onSoftPIP && ratings[report.id] === fromRating,
    )
    if (targets.length > 0) {
      let pick: number
      ;[pick, seed] = nextInt(seed, 0, targets.length - 1)
      const target = targets[pick]
      reports = reports.map((report) => {
        if (report.id !== target.id) return report
        return direction === 'down' ? bumpDownToME(report) : bumpUpToNI(report)
      })
      teamMoraleDelta -=
        direction === 'down' ? RATING_EFFECTS.EE.teamMorale : -RATING_EFFECTS.NI.teamMorale
      calibrationEvent = { direction, reportId: target.id, reportName: target.name }
    }
  }

  const morale = clamp(state.morale + teamMoraleDelta, 0, 100)
  const rated: GameState = {
    ...state,
    reports: reports.map((report) => ({
      ...report,
      morale: clamp(report.morale + teamMoraleDelta, 0, 100),
    })),
    morale,
    rngSeed: seed,
    calibrationEvent,
  }

  // Boss review uses the post-rating team state, per the end-of-quarter
  // sequence (ratings -> calibration -> boss grade).
  return {
    ...rated,
    lastQuarterResult: computeQuarterResult(rated),
    reputationBoost: false, // consumed by the grade just computed (if set)
    phase: calibrationEvent ? 'calibration' : 'quarter-review',
  }
}

// Named action 'review:calibration-ack'. The override's effects were applied
// at submit time; this just advances to the boss review.
export function acknowledgeCalibration(state: GameState): GameState {
  if (state.phase !== 'calibration') return state
  return { ...state, phase: 'quarter-review' }
}
