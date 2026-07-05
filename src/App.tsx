import { useEffect, useState } from 'react'
import { loadGame, startAutosave } from './game/save/autosave'
import { ClickerButton } from './ui/ClickerButton'
import { SettingsPanel } from './ui/SettingsPanel'

function App() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void loadGame().then(() => setLoaded(true))
    return startAutosave()
  }, [])

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col items-center justify-center gap-10 px-4 py-12 text-center">
      <h1 className="text-3xl font-semibold">Click &amp; Ship</h1>
      {loaded ? (
        <>
          <ClickerButton />
          <SettingsPanel />
        </>
      ) : (
        <p className="text-sm text-neutral-500">Loading save…</p>
      )}
    </main>
  )
}

export default App
