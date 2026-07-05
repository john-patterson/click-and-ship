import { useEffect, useState } from 'react'
import { loadGame, startAutosave } from './game/save/autosave'
import { useGameStore } from './game/store'
import { CalibrationDialog } from './ui/CalibrationDialog'
import { CeremonyScreen } from './ui/CeremonyScreen'
import { EventBanner } from './ui/EventBanner'
import { NoticeBoard } from './ui/NoticeBoard'
import { PromotionModal } from './ui/PromotionModal'
import { QuarterReviewModal } from './ui/QuarterReviewModal'
import { RatingModal } from './ui/RatingModal'
import { RecruitingPanel } from './ui/RecruitingPanel'
import { RunOverScreen } from './ui/RunOverScreen'
import { SettingsPanel } from './ui/SettingsPanel'
import { SprintPlanner } from './ui/SprintPlanner'
import { SprintResults } from './ui/SprintResults'
import { StatsHeader } from './ui/StatsHeader'
import { TeamPanel } from './ui/TeamPanel'

type SideTab = 'team' | 'recruiting'

function App() {
  const phase = useGameStore((s) => s.phase)
  const runNumber = useGameStore((s) => s.runNumber)
  const poolSize = useGameStore((s) => s.candidatePool.length)
  const [sideTab, setSideTab] = useState<SideTab>('team')

  useEffect(() => {
    let stopAutosave: (() => void) | undefined
    // Autosave starts only after the saved game has hydrated, so the initial
    // fresh state can't race in and clobber an existing save.
    void loadGame().then(() => {
      stopAutosave = startAutosave()
    })
    return () => stopAutosave?.()
  }, [])

  const tabClass = (active: boolean) =>
    `rounded-t border-b-2 px-3 py-1 text-sm font-medium ${
      active
        ? 'border-sky-500 text-sky-600 dark:text-sky-400'
        : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
    }`

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">SWE Manager — Run #{runNumber}</h1>

      {phase === 'run-over' ? (
        <RunOverScreen />
      ) : phase === 'ceremony' ? (
        <CeremonyScreen />
      ) : (
        <>
          <StatsHeader />
          <EventBanner />
          <NoticeBoard />
          <div className="grid w-full gap-4 md:grid-cols-2">
            <SprintPlanner />
            <div className="flex flex-col gap-4">
              <SprintResults />
              <div className="flex w-full flex-col">
                <div className="flex gap-1">
                  <button type="button" onClick={() => setSideTab('team')} className={tabClass(sideTab === 'team')}>
                    Team
                  </button>
                  <button
                    type="button"
                    onClick={() => setSideTab('recruiting')}
                    className={tabClass(sideTab === 'recruiting')}
                  >
                    Recruiting{poolSize > 0 ? ` (${poolSize})` : ''}
                  </button>
                </div>
                {sideTab === 'team' ? <TeamPanel /> : <RecruitingPanel />}
              </div>
            </div>
          </div>
        </>
      )}

      <SettingsPanel />
      {phase === 'rating' && <RatingModal />}
      {phase === 'calibration' && <CalibrationDialog />}
      {phase === 'quarter-review' && <QuarterReviewModal />}
      {phase === 'promotions' && <PromotionModal />}
    </main>
  )
}

export default App
