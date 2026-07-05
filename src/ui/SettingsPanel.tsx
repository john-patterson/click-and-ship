import { useState } from 'react'
import { TIER_ORDER } from '../game/constants'
import { exportSaveBase64, importSaveBase64 } from '../game/save/autosave'
import { useGameStore } from '../game/store'

export function SettingsPanel() {
  const [exportedSave, setExportedSave] = useState('')
  const [importText, setImportText] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const tier = useGameStore((s) => s.tier)
  const phase = useGameStore((s) => s.phase)
  const retire = useGameStore((s) => s.retire)

  // Voluntary retirement unlocks at VP tier or higher.
  const canRetire =
    phase !== 'run-over' && TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf('VP')

  const handleExport = async () => {
    setExportedSave(await exportSaveBase64())
    setStatus(null)
  }

  const handleImport = async () => {
    try {
      await importSaveBase64(importText.trim())
      setStatus('Save imported.')
    } catch {
      setStatus('Import failed: that doesn\'t look like a valid save.')
    }
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-3 rounded-lg border border-neutral-200 p-4 text-left dark:border-neutral-800">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Settings
      </h2>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="self-start rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Export save
        </button>
        {exportedSave && (
          <textarea
            readOnly
            value={exportedSave}
            onFocus={(e) => e.currentTarget.select()}
            className="h-20 w-full resize-none rounded border border-neutral-300 bg-neutral-50 p-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
          />
        )}
      </div>

      <div className="flex flex-col gap-2">
        <textarea
          placeholder="Paste an exported save here"
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          className="h-20 w-full resize-none rounded border border-neutral-300 p-2 font-mono text-xs dark:border-neutral-700 dark:bg-neutral-900"
        />
        <button
          type="button"
          onClick={handleImport}
          disabled={!importText.trim()}
          className="self-start rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Import save
        </button>
        {status && <p className="text-xs text-neutral-500">{status}</p>}
      </div>

      {canRetire && (
        <button
          type="button"
          onClick={retire}
          className="self-start rounded border border-neutral-300 px-3 py-1.5 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
        >
          Retire (end the run)
        </button>
      )}
    </div>
  )
}
