import {
  MANAGER_FILL_COST,
  SENIOR_PROPOSAL_PROGRESS_BONUS,
  SENIOR_REFACTOR_APPROVE_COST,
  UNBLOCK_HOLD_DURATION_MS,
} from './constants'
import { specializationLabel } from './labels'
import { createInitialGameState, type GameState } from './save/schema'
import { appendLog, updateSubtask, updateTeamMember } from './state-helpers'

export function assignDev(state: GameState, devId: string, subtaskId: string | null): GameState {
  const dev = state.team.find((m) => m.id === devId)
  if (!dev) return state

  if (subtaskId !== null) {
    const subtaskExists = state.project.subtasks.some((t) => t.id === subtaskId)
    if (!subtaskExists) return state

    const takenBySomeoneElse = state.team.some(
      (m) => m.id !== devId && m.assignedSubtaskId === subtaskId,
    )
    if (takenBySomeoneElse) return state
  }

  return updateTeamMember(state, devId, { assignedSubtaskId: subtaskId })
}

export function assignManagerFill(state: GameState, subtaskId: string): GameState {
  const subtask = state.project.subtasks.find((t) => t.id === subtaskId)
  if (!subtask || subtask.done || subtask.managerFilling) return state

  const alreadyAssigned = state.team.some((m) => m.assignedSubtaskId === subtaskId)
  if (alreadyAssigned) return state

  if (state.managerTimeBudget < MANAGER_FILL_COST) return state

  const filled = updateSubtask(
    { ...state, managerTimeBudget: state.managerTimeBudget - MANAGER_FILL_COST },
    subtaskId,
    { managerFilling: true },
  )
  return appendLog(
    { ...filled, managerFillSpendThisQuarter: filled.managerFillSpendThisQuarter + MANAGER_FILL_COST },
    `Manager time spent covering ${specializationLabel[subtask.specialization].toLowerCase()}.`,
    'info',
  )
}

export function holdUnblockTick(state: GameState, devId: string, deltaMs: number): GameState {
  const dev = state.team.find((m) => m.id === devId)
  if (!dev || !dev.blocked) return state

  const progress = dev.unblockHoldProgress + deltaMs / UNBLOCK_HOLD_DURATION_MS
  if (progress >= 1) {
    return appendLog(
      updateTeamMember(state, devId, { blocked: false, unblockHoldProgress: 0 }),
      `${dev.name} is unblocked and back to work.`,
      'success',
    )
  }

  return updateTeamMember(state, devId, { unblockHoldProgress: progress })
}

export function releaseUnblockHold(state: GameState, devId: string): GameState {
  const dev = state.team.find((m) => m.id === devId)
  if (!dev || !dev.blocked) return state
  return updateTeamMember(state, devId, { unblockHoldProgress: 0 })
}

export function respondToEvent(state: GameState, choice: 'approve' | 'deny'): GameState {
  const pending = state.pendingEvent
  if (!pending) return state

  if (choice === 'deny') {
    return appendLog({ ...state, pendingEvent: null }, 'Deferred.', 'info')
  }

  if (state.managerTimeBudget < SENIOR_REFACTOR_APPROVE_COST) return state

  const subtask = state.project.subtasks.find((t) => t.id === pending.subtaskId)
  if (!subtask) return { ...state, pendingEvent: null }

  const progress = Math.min(100, subtask.progress + SENIOR_PROPOSAL_PROGRESS_BONUS)
  const done = progress >= 100

  let next = updateSubtask(
    { ...state, managerTimeBudget: state.managerTimeBudget - SENIOR_REFACTOR_APPROVE_COST },
    subtask.id,
    { progress, done },
  )
  next = { ...next, pendingEvent: null }
  if (done && !subtask.done) {
    next = { ...next, subtasksCompletedThisQuarter: next.subtasksCompletedThisQuarter + 1 }
  }

  return appendLog(
    next,
    `Refactor approved on ${specializationLabel[subtask.specialization].toLowerCase()}.`,
    'success',
  )
}

export function acknowledgeQuarterReview(state: GameState): GameState {
  if (state.phase !== 'quarter-review') return state
  return { ...state, phase: 'active' }
}

export function restartRun(state: GameState): GameState {
  return { ...createInitialGameState(), runNumber: state.runNumber + 1 }
}
