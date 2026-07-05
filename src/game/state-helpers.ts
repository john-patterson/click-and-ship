import { EVENT_LOG_MAX_ENTRIES } from './constants'
import type { EventLogEntry, EventLogKind, GameState, SubTask, TeamMember } from './save/schema'

export function updateTeamMember(
  state: GameState,
  id: string,
  patch: Partial<TeamMember>,
): GameState {
  return {
    ...state,
    team: state.team.map((m) => (m.id === id ? { ...m, ...patch } : m)),
  }
}

export function updateSubtask(
  state: GameState,
  id: string,
  patch: Partial<SubTask>,
): GameState {
  return {
    ...state,
    project: {
      ...state.project,
      subtasks: state.project.subtasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    },
  }
}

// Newest-first, capped at EVENT_LOG_MAX_ENTRIES. Ids are derived purely from
// state (quarter/sprint/log length) rather than randomness or wall-clock
// time, so identical tick sequences replay to identical results.
export function appendLog(state: GameState, message: string, kind: EventLogKind): GameState {
  const entry: EventLogEntry = {
    id: `log-${state.quarter}-${state.sprint}-${state.eventLog.length}`,
    quarter: state.quarter,
    sprint: state.sprint,
    message,
    kind,
  }
  return { ...state, eventLog: [entry, ...state.eventLog].slice(0, EVENT_LOG_MAX_ENTRIES) }
}
