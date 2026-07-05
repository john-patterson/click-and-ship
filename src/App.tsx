import { useEffect } from 'react'
import { loadGame, startAutosave } from './game/save/autosave'
import { useGameStore } from './game/store'
import { EventBanner } from './ui/EventBanner'
import { QuarterReviewModal } from './ui/QuarterReviewModal'
import { RunOverScreen } from './ui/RunOverScreen'
import { SettingsPanel } from './ui/SettingsPanel'
import { SprintPlanner } from './ui/SprintPlanner'
import { SprintResults } from './ui/SprintResults'
import { StatsHeader } from './ui/StatsHeader'
import { TeamPanel } from './ui/TeamPanel'

function App() {
  const phase = useGameStore((s) => s.phase)
  const runNumber = useGameStore((s) => s.runNumber)

  useEffect(() => {
    let stopAutosave: (() => void) | undefined
    // Autosave starts only after the saved game has hydrated, so the initial
    // fresh state can't race in and clobber an existing save.
    void loadGame().then(() => {
      stopAutosave = startAutosave()
    })
    return () => stopAutosave?.()
  }, [])

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center gap-4 px-4 py-8">
      <h1 className="text-2xl font-semibold">SWE Manager — Run #{runNumber}</h1>

      {phase === 'run-over' ? (
        <RunOverScreen />
      ) : (
        <>
          <StatsHeader />
          <EventBanner />
          <div className="grid w-full gap-4 md:grid-cols-2">
            <SprintPlanner />
            <div className="flex flex-col gap-4">
              <SprintResults />
              <TeamPanel />
            </div>
          </div>
        </>
      )}

      <SettingsPanel />
      {phase === 'quarter-review' && <QuarterReviewModal />}
    </main>
  )
}

export default App
