import { create } from 'zustand'
import { logAction } from './actionBuffer'
import {
  acceptRefactor,
  declineRefactor,
  endQuarter,
  restartRun,
  runSprint,
  toggleActivity,
} from './actions'
import { applyLegacyPick, decidePromotion, retire, type LegacyPick, type PromotionDecision } from './promotion'
import { fireReport, hireCandidate } from './recruiting'
import { acknowledgeCalibration, submitRatings } from './reviews'
import { createInitialGameState, type ActivityId, type GameState, type Rating } from './save/schema'

// Thin Zustand bridge: every mutation goes through a named action (logged to
// the in-memory action buffer) and a pure reducer from src/game/.

interface GameStore extends GameState {
  hydrate: (state: GameState) => void
  toggleActivity: (activityId: ActivityId) => void
  runSprint: () => void
  submitRatings: (ratings: Record<string, Rating>) => void
  acknowledgeCalibration: () => void
  endQuarter: () => void
  decidePromotion: (decision: PromotionDecision) => void
  pickLegacy: (pick: LegacyPick) => void
  hireCandidate: (candidateId: string) => void
  fireReport: (reportId: string) => void
  acceptRefactor: () => void
  declineRefactor: () => void
  retire: () => void
  restartRun: () => void
}

// Only the GameState-shaped fields, never the action closures above — keeps
// the pure src/game/ reducers operating on plain, JSON-serializable state,
// and is what gets persisted to a save file.
function extractGameState(store: GameStore): GameState {
  return {
    quarter: store.quarter,
    sprint: store.sprint,
    tier: store.tier,
    morale: store.morale,
    techDebt: store.techDebt,
    careerPoints: store.careerPoints,
    politicalCapital: store.politicalCapital,
    selectedActivities: store.selectedActivities,
    currentEvent: store.currentEvent,
    quarterSp: store.quarterSp,
    quarterIncidents: store.quarterIncidents,
    sprintHistory: store.sprintHistory,
    lastQuarterResult: store.lastQuarterResult,
    onPip: store.onPip,
    consecutiveDs: store.consecutiveDs,
    gradeHistory: store.gradeHistory,
    totalSpRun: store.totalSpRun,
    rngSeed: store.rngSeed,
    phase: store.phase,
    runOverReason: store.runOverReason,
    runNumber: store.runNumber,
    reports: store.reports,
    candidatePool: store.candidatePool,
    committedHours: store.committedHours,
    pendingCommittedHours: store.pendingCommittedHours,
    pendingRefactor: store.pendingRefactor,
    calibrationEvent: store.calibrationEvent,
    promotionQueue: store.promotionQueue,
    legacyPicks: store.legacyPicks,
    reputationBoost: store.reputationBoost,
    allyReportId: store.allyReportId,
    metaProgression: store.metaProgression,
    notices: store.notices,
  }
}

export const useGameStore = create<GameStore>((set) => {
  const dispatch = (action: string, reducer: (state: GameState) => GameState, payload?: unknown) =>
    set((store) => {
      logAction(action, payload)
      return reducer(extractGameState(store))
    })

  return {
    ...createInitialGameState(),
    hydrate: (state) => dispatch('save:hydrate', () => state),
    toggleActivity: (activityId) =>
      dispatch('sprint:allocate', (s) => toggleActivity(s, activityId), { activityId }),
    runSprint: () => dispatch('sprint:run', runSprint),
    submitRatings: (ratings) => dispatch('review:rate', (s) => submitRatings(s, ratings), { ratings }),
    acknowledgeCalibration: () => dispatch('review:calibration-ack', acknowledgeCalibration),
    endQuarter: () => dispatch('quarter:end', endQuarter),
    decidePromotion: (decision) =>
      dispatch('promo:decide', (s) => decidePromotion(s, decision), { decision }),
    pickLegacy: (pick) => dispatch('promotion:legacy', (s) => applyLegacyPick(s, pick), { pick }),
    hireCandidate: (candidateId) =>
      dispatch('recruit:hire', (s) => hireCandidate(s, candidateId), { candidateId }),
    fireReport: (reportId) => dispatch('team:fire', (s) => fireReport(s, reportId), { reportId }),
    acceptRefactor: () => dispatch('refactor:accept', acceptRefactor),
    declineRefactor: () => dispatch('refactor:decline', declineRefactor),
    retire: () => dispatch('run:retire', retire),
    restartRun: () => dispatch('run:restart', restartRun),
  }
})

export function getGameState(): GameState {
  return extractGameState(useGameStore.getState())
}
