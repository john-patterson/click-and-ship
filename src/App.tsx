import { useEffect } from 'react'
import { startGameLoop } from './game/loop'
import { loadGame, startAutosave } from './game/save/autosave'
import { useGameStore } from './game/store'
import { EventLog } from './ui/EventLog'
import { PendingEventBanner } from './ui/PendingEventBanner'
import { ProjectPanel } from './ui/ProjectPanel'
import { QuarterReviewModal } from './ui/QuarterReviewModal'
import { SettingsPanel } from './ui/SettingsPanel'
import { SprintControls } from './ui/SprintControls'
import { TeamPanel } from './ui/TeamPanel'

function App() {
  const phase = useGameStore((s) => s.phase)
  const runNumber = useGameStore((s) => s.runNumber)

  useEffect(() => {
    void loadGame()
    const stopAutosave = startAutosave()
    const stopLoop = startGameLoop()
    return () => {
      stopAutosave()
      stopLoop()
    }
  }, [])

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">SWE Manager — Run #{runNumber}</h1>
      <SprintControls />
      <PendingEventBanner />
      <div className="grid w-full max-w-md gap-4 md:max-w-none md:grid-cols-2">
        <TeamPanel />
        <ProjectPanel />
      </div>
      <EventLog />
      <SettingsPanel />
      {phase !== 'active' && <QuarterReviewModal />}
    </main>
  )
}

export default App
