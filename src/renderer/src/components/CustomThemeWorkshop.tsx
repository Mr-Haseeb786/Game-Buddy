import { useState, useEffect } from 'react'
import { Check, Edit3, Power, PaintBucket } from 'lucide-react'
import { generateThemeMatrix } from '../themeEngine'
import { ChassisType, CustomThemePayload } from 'src/shared/types'

interface CustomThemeWorkshopProps {
  currentPayload?: CustomThemePayload
  onSave: (payload: CustomThemePayload) => void
  onDisable: () => void
}

export default function CustomThemeWorkshop({
  currentPayload,
  onSave,
  onDisable
}: CustomThemeWorkshopProps) {
  // Safe default draft state
  const [draft, setDraft] = useState<CustomThemePayload>({
    enabled: true,
    chassis: currentPayload?.chassis || 'obsidian',
    energyCore: currentPayload?.energyCore || '#00c2ff'
  })

  // Real-time CSS matrix for the miniature preview hologram
  const [previewStyles, setPreviewStyles] = useState<Record<string, string>>({})

  useEffect(() => {
    const matrix = generateThemeMatrix(draft)
    if (matrix) setPreviewStyles(matrix)
  }, [draft])

  const chassisOptions: { id: ChassisType; label: string }[] = [
    { id: 'obsidian', label: 'Obsidian Dark' },
    { id: 'oled', label: 'Pure OLED Black' },
    { id: 'midnight', label: 'Midnight Blue' }
  ]

  return (
    <div className="flex flex-col gap-6 p-6 rounded-2xl border-2 border-modifier/30 bg-modifier/5 relative overflow-hidden">
      {/* 1. THE HOLOGRAPHIC PREVIEW */}
      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-bold text-textMain uppercase tracking-widest flex items-center gap-2">
          <Edit3 size={16} className="text-accent" /> Live Telemetry
        </h4>

        {/* The Mini App Wireframe */}
        <div
          className="w-full h-40 rounded-xl border border-white/10 shadow-inner flex overflow-hidden transition-all duration-300"
          style={{ backgroundColor: previewStyles['--app-bg-primary'] }}
        >
          {/* Mini Sidebar */}
          <div
            className="w-16 h-full border-r border-white/5 flex flex-col items-center py-4 gap-3"
            style={{ backgroundColor: previewStyles['--app-bg-modifier'] }}
          >
            <div
              className="w-8 h-8 rounded-[0.4rem]"
              style={{ backgroundColor: previewStyles['--app-accent'] }}
            />
            <div className="w-6 h-6 rounded-full bg-white/10" />
            <div className="w-6 h-6 rounded-full bg-white/10" />
          </div>

          {/* Mini Main Area */}
          <div className="flex-1 p-4 flex flex-col gap-3">
            {/* Mini TopBar */}
            <div
              className="h-6 w-full rounded-md flex items-center px-2 border border-white/5"
              style={{ backgroundColor: previewStyles['--app-bg-secondary'] }}
            >
              <div
                className="w-20 h-2 rounded-full"
                style={{ backgroundColor: previewStyles['--app-text-muted'] }}
              />
            </div>
            {/* Mini Grid */}
            <div className="flex-1 grid grid-cols-3 gap-2">
              <div
                className="rounded-lg border border-white/5 relative overflow-hidden"
                style={{ backgroundColor: previewStyles['--app-bg-secondary'] }}
              >
                <div
                  className="absolute inset-0 opacity-20"
                  style={{ backgroundColor: previewStyles['--app-active-ambiance'] }}
                />
                <div
                  className="absolute bottom-2 left-2 w-12 h-1.5 rounded-full"
                  style={{ backgroundColor: previewStyles['--app-accent'] }}
                />
              </div>
              <div
                className="rounded-lg border border-white/5"
                style={{ backgroundColor: previewStyles['--app-bg-secondary'] }}
              />
              <div
                className="rounded-lg border border-white/5"
                style={{ backgroundColor: previewStyles['--app-bg-secondary'] }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. THE CONTROLS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Chassis Selector */}
        <div className="flex flex-col gap-3">
          <h5 className="text-sm font-bold text-textMuted">Base Chassis</h5>
          <div className="flex flex-col gap-2">
            {chassisOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDraft({ ...draft, chassis: opt.id })}
                className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-bold text-left transition-all ${
                  draft.chassis === opt.id
                    ? 'bg-accent/20 text-accent border border-accent/50'
                    : 'bg-primary/50 text-textMuted border border-transparent hover:bg-modifier/30'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Energy Core Selector */}
        <div className="flex flex-col gap-3">
          <h5 className="text-sm font-bold text-textMuted">Energy Core (Hex)</h5>
          <div className="flex items-center gap-4 bg-primary/50 p-2 rounded-xl border border-modifier/30">
            {/* The Native HTML Color Picker - styled to look sleek */}
            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border-2 border-white/10 shadow-lg cursor-pointer">
              <input
                type="color"
                value={draft.energyCore}
                onChange={(e) => setDraft({ ...draft, energyCore: e.target.value })}
                className="absolute inset-[-10px] w-20 h-20 cursor-pointer"
              />
            </div>
            <input
              type="text"
              value={draft.energyCore.toUpperCase()}
              onChange={(e) => setDraft({ ...draft, energyCore: e.target.value })}
              className="bg-transparent border-none outline-none text-xl font-black text-textMain tracking-widest w-full font-mono uppercase"
              maxLength={7}
            />
          </div>
        </div>
      </div>

      {/* 3. ACTION BAR */}
      <div className="pt-4 border-t border-modifier/30 flex justify-between items-center mt-2">
        {currentPayload?.enabled ? (
          <button
            onClick={onDisable}
            className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl bg-danger/10 text-danger hover:bg-danger/20 text-sm font-bold transition-all"
          >
            <Power size={16} /> Disable Custom Engine
          </button>
        ) : (
          <div className="text-sm text-textMuted">Custom engine currently offline.</div>
        )}

        <button
          onClick={() => onSave(draft)}
          className="cursor-pointer flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent text-primary text-sm font-black transition-all hover:scale-105 shadow-[0_0_20px_rgba(var(--app-active-ambiance),0.8)]"
        >
          <PaintBucket size={16} /> Inject Custom Matrix
        </button>
      </div>
    </div>
  )
}
