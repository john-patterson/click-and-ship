import {
  DEFERRED_PROMOTIONS_BEFORE_QUIT,
  LEGACY_ALLY_LOYALTY,
  LEGACY_POLITICAL_CAPITAL,
  PROMO_BASE_SP,
  PROMO_DENY_PERSONAL_MORALE,
  PROMO_EE_REQUIRED,
  PROMO_LOYALTY,
  PROMO_POLITICAL_CAPITAL_COST,
  PROMO_PREP_HOURS,
  PROMO_SALARY_HOURS,
  PROMO_TARGET,
  PROMO_TEAM_MORALE,
  QUIT_TEAM_MORALE_PENALTY,
  TIER_ORDER,
} from './constants'
import { finishQuarter } from './quarter'
import type { GameState, LegacyPickId, MetaProgression, Report, Role, Tier } from './save/schema'
import { applyTeamMorale, clamp, updateReport } from './team'

export type PromotionDecision = 'approve' | 'deny' | 'defer'

export function promotionTarget(role: Role): Role | undefined {
  return PROMO_TARGET[role]
}

// DESIGN NOTE: the spec counts "lifetime EE ratings", but that would chain —
// the two EEs that promote a Junior to SWE II would immediately qualify them
// for Senior. EEs earned since the last promotion are counted instead.
export function eeSincePromotion(report: Report): number {
  return report.ratingHistory.filter(
    (entry) => entry.rating === 'EE' && entry.quarter > report.lastPromotedQuarter,
  ).length
}

export function promotionEligible(report: Report): boolean {
  const required = PROMO_EE_REQUIRED[report.role]
  return required !== undefined && eeSincePromotion(report) >= required
}

export function buildPromotionQueue(state: GameState): string[] {
  return state.reports.filter(promotionEligible).map((report) => report.id)
}

export function raisePeakTier(meta: MetaProgression, tier: Tier): MetaProgression {
  return TIER_ORDER.indexOf(tier) > TIER_ORDER.indexOf(meta.peakTier)
    ? { ...meta, peakTier: tier }
    : meta
}

// Named action 'promo:decide'. Resolves the promotion case at the head of
// the queue; when the queue empties, the quarter wraps up (recruiting
// cleanup, auto-fires, next quarter).
export function decidePromotion(state: GameState, decision: PromotionDecision): GameState {
  if (state.phase !== 'promotions') return state
  const [reportId, ...remaining] = state.promotionQueue
  if (!reportId) return state
  const report = state.reports.find((r) => r.id === reportId)

  let next: GameState = { ...state, promotionQueue: remaining }

  if (report) {
    if (decision === 'approve') {
      if (state.politicalCapital < PROMO_POLITICAL_CAPITAL_COST) return state
      const target = promotionTarget(report.role)
      if (!target) return state
      next = updateReport(next, reportId, (r) => ({
        ...r,
        role: target,
        baseSp: PROMO_BASE_SP[target] ?? r.baseSp,
        salaryHours: r.salaryHours + PROMO_SALARY_HOURS,
        loyalty: r.loyalty + PROMO_LOYALTY,
        timesPromoted: r.timesPromoted + 1,
        lastPromotedQuarter: state.quarter,
        deferredPromotions: 0,
        promotionDenied: false,
      }))
      next = applyTeamMorale(next, PROMO_TEAM_MORALE)
      next = {
        ...next,
        politicalCapital: next.politicalCapital - PROMO_POLITICAL_CAPITAL_COST,
        // Promo case prep eats manager hours at the start of next quarter.
        pendingCommittedHours: next.pendingCommittedHours + PROMO_PREP_HOURS,
        notices: [...next.notices, `${report.name} was promoted to ${target}.`],
      }
      // DESIGN NOTE: Staff should propose 2x as many technical projects with
      // half as many pointless refactors; the technical-project system isn't
      // built yet, so only the refactor-addict half-rate is wired (see
      // REFACTOR_PROPOSAL_CHANCE).
    } else if (decision === 'deny') {
      next = updateReport(next, reportId, (r) => ({
        ...r,
        morale: clamp(r.morale - PROMO_DENY_PERSONAL_MORALE, 0, 100),
        promotionDenied: true, // flight risk until they earn another EE
      }))
      // DESIGN NOTE: the spec's "team morale -2 if they were popular" is
      // skipped for this phase — popularity isn't modeled yet.
    } else {
      const deferred = report.deferredPromotions + 1
      if (deferred >= DEFERRED_PROMOTIONS_BEFORE_QUIT) {
        // "You promised next cycle" twice; they stop waiting.
        next = {
          ...next,
          reports: next.reports.filter((r) => r.id !== reportId),
          notices: [
            ...next.notices,
            `${report.name} quit after being promised a promotion twice.`,
          ],
        }
        // DESIGN NOTE: the spec doesn't price this departure; it uses the
        // standard quit penalty (-10 team morale).
        next = applyTeamMorale(next, -QUIT_TEAM_MORALE_PENALTY)
      } else {
        next = updateReport(next, reportId, (r) => ({
          ...r,
          deferredPromotions: deferred,
        }))
      }
    }
  }

  return next.promotionQueue.length > 0 ? next : finishQuarter(next)
}

export type LegacyPick =
  | { type: 'ally'; reportId: string }
  | { type: 'capital' }
  | { type: 'reputation' }

// Named action 'promotion:legacy'. Applies the ceremony's carry-forward pick
// and moves the player into the next tier.
//
// DESIGN NOTE (MoM tier, Phase 5 preview — intentionally not built here):
// at Manager of Managers the team becomes 3 managers, each with 4-6
// abstracted devs. The player rates managers, not devs; each manager gets a
// boss-style grade from their team's aggregate morale/debt/SP, and those
// grades cascade up into the player's own grade. Individual devs surface
// only via events ("Manager Priya's report Alice threatened to quit"). For
// now the promotion lands on a "coming soon" run-over screen.
export function applyLegacyPick(state: GameState, pick: LegacyPick): GameState {
  if (state.phase !== 'ceremony') return state

  let next: GameState = {
    ...state,
    legacyPicks: [...state.legacyPicks, pick.type as LegacyPickId],
    careerPoints: 0,
    tier: 'MoM',
    metaProgression: raisePeakTier(state.metaProgression, 'MoM'),
    phase: 'run-over',
    runOverReason: 'promoted',
  }

  if (pick.type === 'ally') {
    const ally = state.reports.find((r) => r.id === pick.reportId)
    if (!ally) return state
    next = updateReport(next, ally.id, (r) => ({
      ...r,
      loyalty: r.loyalty + LEGACY_ALLY_LOYALTY,
    }))
    next = { ...next, allyReportId: ally.id }
  } else if (pick.type === 'capital') {
    next = { ...next, politicalCapital: next.politicalCapital + LEGACY_POLITICAL_CAPITAL }
  } else {
    next = { ...next, reputationBoost: true }
  }

  return next
}

// Named action 'run:retire'. Voluntary retirement, VP tier or higher only;
// ends the run cleanly and banks the peak tier in meta-progression.
export function retire(state: GameState): GameState {
  if (TIER_ORDER.indexOf(state.tier) < TIER_ORDER.indexOf('VP')) return state
  if (state.phase === 'run-over') return state
  return {
    ...state,
    phase: 'run-over',
    runOverReason: 'retired',
    metaProgression: raisePeakTier(state.metaProgression, state.tier),
  }
}
