import { useEffect } from 'react'
import { loadGame, startAutosave } from './game/save/autosave'
import { ClickerButton } from './ui/ClickerButton'
import { SettingsPanel } from './ui/SettingsPanel'

function App() {
  useEffect(() => {
    void loadGame()
    return startAutosave()
  }, [])

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-10 px-4 py-12 text-center">
      <h1 className="text-3xl font-semibold">Click &amp; Ship</h1>
      <ClickerButton />
      <SettingsPanel />
    </main>
  )
}

export default App
