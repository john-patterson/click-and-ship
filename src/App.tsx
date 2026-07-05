import { useEffect } from 'react'
import { startGameLoop } from './game/loop'
import { loadGame, startAutosave } from './game/save/autosave'
import { useGameStore } from './game/store'
import { SettingsPanel } from './ui/SettingsPanel'

function App() {
  const state = useGameStore()

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
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-10 px-4 py-12 text-center">
      <h1 className="text-3xl font-semibold">SWE Manager</h1>
      {/* Temporary debug dump until the real UI (TeamPanel/ProjectPanel/etc.) lands. */}
      <pre className="w-full overflow-auto rounded border border-neutral-300 p-2 text-left text-xs dark:border-neutral-700">
        {JSON.stringify(state, null, 2)}
      </pre>
      <SettingsPanel />
    </main>
  )
}

export default App
