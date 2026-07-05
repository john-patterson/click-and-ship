import { TEAM, TEAM_BASE_SP } from '../game/constants'

// The MVP roster is fixed data (no hiring yet), so this panel is purely
// informational.
export function TeamPanel() {
  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Team</h2>
      <ul className="flex flex-col gap-1 text-sm">
        {TEAM.map((member) => (
          <li key={member.id} className="flex items-baseline justify-between gap-2">
            <span>
              <span className="font-medium">{member.name}</span>{' '}
              <span className="text-neutral-500">
                — {member.role}
                {member.spec ? ` (${member.spec})` : ''}
              </span>
            </span>
            <span className="tabular-nums text-neutral-500">{member.baseSp} SP</span>
          </li>
        ))}
      </ul>
      <p className="border-t border-neutral-200 pt-2 text-xs text-neutral-500 dark:border-neutral-800">
        Baseline {TEAM_BASE_SP} SP/sprint. Product and design are uncovered — someone (you) has
        to fill those gaps.
      </p>
    </div>
  )
}
