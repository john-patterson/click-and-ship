import { GRADE_THRESHOLDS, SPRINTS_PER_QUARTER } from './constants'
import { createProject, type GameState, type QuarterReviewResult } from './save/schema'
import { appendLog } from './state-helpers'

export function computeQuarterReview(state: GameState): QuarterReviewResult {
  const rawScore =
    state.subtasksCompletedThisQuarter * 25 -
    state.incidentsThisQuarter * 10 -
    Math.min(state.managerFillSpendThisQuarter, 100) * 0.2
  const score = Math.max(0, Math.min(100, rawScore))
  const grade = gradeForScore(score)

  return {
    quarter: state.quarter,
    score,
    grade,
    passed: grade === 'A' || grade === 'B' || grade === 'C',
    subtasksCompleted: state.subtasksCompletedThisQuarter,
    incidents: state.incidentsThisQuarter,
    managerFillSpend: state.managerFillSpendThisQuarter,
  }
}

function gradeForScore(score: number): QuarterReviewResult['grade'] {
  if (score >= GRADE_THRESHOLDS.A) return 'A'
  if (score >= GRADE_THRESHOLDS.B) return 'B'
  if (score >= GRADE_THRESHOLDS.C) return 'C'
  if (score >= GRADE_THRESHOLDS.D) return 'D'
  return 'F'
}

// Resolves one sprint boundary: resets the per-sprint manager-time budget
// and manager-fill flags, advances sprint/quarter counters, and grades the
// quarter (possibly ending the run) when the last sprint of a quarter closes.
export function resolveSprintEnd(state: GameState): GameState {
  let next: GameState = {
    ...state,
    managerTimeBudget: state.managerTimeBudgetMax,
    project: {
      ...state.project,
      subtasks: state.project.subtasks.map((t) => ({ ...t, managerFilling: false })),
    },
  }
  next = appendLog(next, `Sprint ${next.sprint} complete.`, 'info')

  if (next.sprint < SPRINTS_PER_QUARTER) {
    return { ...next, sprint: next.sprint + 1 }
  }

  const result = computeQuarterReview(next)
  next = appendLog(
    next,
    `Quarter ${result.quarter} review: grade ${result.grade} (score ${Math.round(result.score)}).`,
    result.passed ? 'success' : 'danger',
  )

  const projectFinished = next.project.subtasks.every((t) => t.done)
  return {
    ...next,
    sprint: 1,
    quarter: next.quarter + 1,
    lastQuarterResult: result,
    phase: result.passed ? 'quarter-review' : 'game-over',
    subtasksCompletedThisQuarter: 0,
    incidentsThisQuarter: 0,
    managerFillSpendThisQuarter: 0,
    project: projectFinished ? createProject(next.quarter + 1) : next.project,
  }
}
