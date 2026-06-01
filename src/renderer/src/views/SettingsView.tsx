import { AnimatePresence, motion } from 'framer-motion'
import {
  Palette,
  Zap,
  Leaf,
  Monitor,
  CheckCircle2,
  ImageIcon,
  Trash2,
  UploadCloud,
  HardDrive,
  LinkIcon,
  Grid,
  Loader2,
  Sliders
} from 'lucide-react'
import { AppSettings } from '../../../shared/types' // Adjust path
import { useEffect, useState } from 'react'
import WallpaperGalleryModal from '@renderer/components/WallpaperGalleryModal'
import WallpaperCropperModal from '@renderer/components/WallpaperCropperModal'
import CustomThemeWorkshop from '@renderer/components/CustomThemeWorkshop'

interface SettingsViewProps {
  settings: AppSettings | null
  onUpdatePreferences: (prefs: Partial<AppSettings['preferences']>) => void
}

export default function SettingsView({ settings, onUpdatePreferences }: SettingsViewProps) {
  const currentTheme = settings?.preferences?.theme || 'default'
  const ecoMode = settings?.preferences?.ecoMode || false

  const [showUrlInput, setShowUrlInput] = useState(false)
  const [wallpaperUrlInput, setWallpaperUrlInput] = useState('')
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [archiveCount, setArchiveCount] = useState(0)

  const [showAdvanced, setShowAdvanced] = useState(false)
  const advancedOpts = settings?.preferences?.advancedVisuals || {
    showSearchWallpaper: false,
    enableSearchAmbience: true
  }

  const isAnimatedMedia = (url: string) => {
    const lower = url.toLowerCase()
    return lower.endsWith('.gif') || lower.endsWith('.mp4') || lower.endsWith('.webm')
  }

  const refreshArchiveCount = async () => {
    const history = await window.api.getWallpaperHistory()
    setArchiveCount(history.length)
  }

  // Initial load
  useEffect(() => {
    refreshArchiveCount()
  }, [])

  // Refresh the count whenever the gallery closes (in case they deleted items)
  useEffect(() => {
    if (!galleryOpen) refreshArchiveCount()
  }, [galleryOpen])

  // The visual data for our interactive theme cards
  const themeOptions = [
    {
      id: 'default',
      name: 'Obsidian Dark',
      description: 'The standard issue high-contrast dark mode.',
      colors: { bg: '#0a0a0a', primary: '#121212', accent: '#00c2ff' }
    },
    {
      id: 'cyberpunk',
      name: 'Night City',
      description: 'High-voltage neon yellow and deep purples.',
      colors: { bg: '#0f0a1a', primary: '#1a1025', accent: '#fafa37' }
    },
    {
      id: 'midnight',
      name: 'Midnight Forest',
      description: 'Calming deep greens and emerald accents.',
      colors: { bg: '#05100a', primary: '#0a1a12', accent: '#34d399' }
    }
  ]

  const handleImportWallpaper = async () => {
    const url = await window.api.importWallpaper()
    if (url) {
      if (isAnimatedMedia(url)) {
        // SMART BYPASS: Set videos/GIFs instantly
        onUpdatePreferences({ wallpaper: url })
        refreshArchiveCount()
      } else {
        // STATIC IMAGE: Open the cropper
        setCropImageSrc(url)
      }
    }
  }

  const handleClearWallpaper = () => {
    // Nullifies the wallpaper, instantly hiding the <video> or <img> tag in App.tsx
    onUpdatePreferences({ wallpaper: '' })
  }

  const handleUrlDownload = async () => {
    if (!wallpaperUrlInput.trim()) return
    setIsDownloading(true)

    const localUrl = await window.api.downloadWallpaperUrl(wallpaperUrlInput.trim())

    if (localUrl) {
      setShowUrlInput(false)
      setWallpaperUrlInput('')

      if (isAnimatedMedia(localUrl)) {
        // SMART BYPASS
        onUpdatePreferences({ wallpaper: localUrl })
        refreshArchiveCount()
      } else {
        // STATIC IMAGE
        setCropImageSrc(localUrl)
      }
    } else {
      alert('Network Error: Unable to extract media from the provided URL.')
    }

    setIsDownloading(false)
  }

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-10 pb-20">
      {/* Header */}
      <div className="">
        <h2 className="text-3xl font-black text-textMain tracking-wide flex items-center gap-3">
          <Monitor className="text-accent" size={28} /> System Configurations
        </h2>
        <p className="text-textMuted mt-2">
          Customize your agent's interface and manage hardware limits.
        </p>
      </div>

      {/* --- APPEARANCE SECTION --- */}
      <section className="flex flex-col gap-5">
        <h3 className="text-lg font-bold text-textMain flex items-center gap-2 border-b border-modifier/50 pb-2">
          <Palette size={18} className="text-accent" /> Interface Theming
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-2">
          {themeOptions.map((theme) => {
            const isActive = currentTheme === theme.id
            return (
              <div
                key={theme.id}
                onClick={() => onUpdatePreferences({ theme: theme.id as any })}
                className={`relative p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 overflow-hidden group ${
                  isActive
                    ? 'border-accent bg-modifier/20 shadow-[0_0_30px_rgba(var(--color-accent),0.1)]'
                    : 'border-modifier/30 bg-modifier/5 hover:border-modifier hover:bg-modifier/10'
                }`}
              >
                {/* Active Checkmark */}
                {isActive && (
                  <div className="absolute top-4 right-4 text-accent">
                    <CheckCircle2 size={20} />
                  </div>
                )}

                {/* Color Swatch Preview */}
                <div
                  className="w-full h-24 rounded-xl mb-4 border border-white/10 shadow-inner flex flex-col overflow-hidden"
                  style={{ backgroundColor: theme.colors.bg }}
                >
                  {/* Mock Topbar */}
                  <div
                    className="h-6 w-full border-b border-white/5 flex items-center px-2 gap-1"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                    <div className="w-2 h-2 rounded-full bg-white/20" />
                  </div>
                  {/* Mock Content area with Accent */}
                  <div className="flex-1 flex items-center justify-center relative">
                    <div
                      className="w-12 h-2 rounded-full opacity-80"
                      style={{
                        backgroundColor: theme.colors.accent,
                        boxShadow: `0 0 10px ${theme.colors.accent}`
                      }}
                    />
                  </div>
                </div>

                <h4 className="font-bold text-textMain">{theme.name}</h4>
                <p className="text-xs text-textMuted mt-1 leading-relaxed">{theme.description}</p>
              </div>
            )
          })}
        </div>

        {/* --- CUSTOM ENGINE WORKSHOP --- */}
        <div className="mt-8">
          <CustomThemeWorkshop
            currentPayload={settings?.preferences?.customTheme}
            onSave={(payload) => onUpdatePreferences({ customTheme: payload })}
            onDisable={() =>
              onUpdatePreferences({
                customTheme: { ...settings?.preferences?.customTheme, enabled: false } as any
              })
            }
          />
        </div>

        {/* --- CUSTOM BACKGROUND ENGINE --- */}
        <div className="mt-4">
          <h4 className="text-md font-bold text-textMain flex items-center gap-2 mb-3">
            <ImageIcon size={18} className="text-accent" /> Custom Environment
          </h4>

          <div className="flex flex-col gap-4 p-5 rounded-2xl border-2 border-modifier/30 bg-modifier/5 transition-colors relative overflow-hidden">
            {/* Loading Overlay */}
            <AnimatePresence>
              {isDownloading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 bg-secondary/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-accent"
                >
                  <Loader2 size={32} className="animate-spin" />
                  <p className="font-bold text-sm tracking-widest uppercase animate-pulse">
                    Extracting Media Protocol...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between gap-6">
              <div className="flex-1">
                <p className="text-sm text-textMuted leading-relaxed">
                  Upload a high-resolution image (JPG/PNG) or an animated video loop (WebM/MP4) to
                  serve as your global backdrop.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {settings?.preferences?.wallpaper && (
                  <button
                    onClick={handleClearWallpaper}
                    className="cursor-pointer px-4 py-2.5 rounded-xl bg-danger/10 hover:bg-danger/20 text-danger text-sm font-bold transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={16} /> Revert
                  </button>
                )}

                {/* Primary Actions */}
                <button
                  onClick={() => setGalleryOpen(true)}
                  className="cursor-pointer relative px-4 py-2.5 rounded-xl bg-modifier/20 hover:bg-modifier/40 text-textMain text-sm font-bold transition-colors flex items-center gap-2"
                >
                  <Grid size={16} /> Archive
                  {/* The Dynamic Number Badge */}
                  {archiveCount > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 bg-accent text-primary text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-primary/70 shadow-lg z-10"
                    >
                      {archiveCount > 99 ? '99+' : archiveCount}
                    </motion.span>
                  )}
                </button>

                <button
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className={`cursor-pointer px-5 py-2.5 rounded-xl border text-sm font-bold transition-all shadow-lg flex items-center gap-2 ${
                    showUrlInput
                      ? 'bg-accent/20 text-accent border-accent/50 shadow-accent/20'
                      : 'bg-modifier/10 hover:bg-modifier/30 text-textMain border-transparent hover:border-modifier/50'
                  }`}
                >
                  <LinkIcon size={16} /> Import URL
                </button>

                <button
                  onClick={handleImportWallpaper}
                  className="cursor-pointer px-5 py-2.5 rounded-xl bg-accent hover:bg-accent/90 text-primary border border-accent/30 text-sm font-black transition-all shadow-[0_0_15px_rgba(var(--color-accent),0.4)] flex items-center gap-2"
                >
                  <HardDrive size={16} /> Local File
                </button>
              </div>
            </div>

            {/* URL Input Drawer */}
            <AnimatePresence>
              {showUrlInput && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-modifier/30 pt-4 mt-2"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Paste direct link to Image, GIF, or MP4..."
                      value={wallpaperUrlInput}
                      onChange={(e) => setWallpaperUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUrlDownload()}
                      className="flex-1 bg-primary border border-modifier/50 rounded-xl px-4 py-2.5 text-sm text-textMain focus:outline-none focus:border-accent transition-colors"
                    />
                    <button
                      onClick={handleUrlDownload}
                      disabled={!wallpaperUrlInput.trim() || isDownloading}
                      className="cursor-pointer px-6 py-2.5 rounded-xl bg-accent/20 text-accent hover:bg-accent/30 font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      <UploadCloud size={16} /> Fetch
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* --- ADVANCED RENDER CONTROLS --- */}
          <div className="mt-2 pt-4 border-t border-modifier/30">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="cursor-pointer flex items-center gap-2 text-sm font-bold text-textMuted hover:text-accent transition-colors"
            >
              <Sliders size={16} /> Advanced Render Controls
            </button>

            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden flex flex-col gap-3 mt-4"
                >
                  {/* Toggle: Wallpaper on Search */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                    <div>
                      <h5 className="text-sm font-bold text-textMain">
                        Render Environment on Search Screen
                      </h5>
                      <p className="text-xs text-textMuted mt-0.5">
                        Allow the custom wallpaper to render behind the Game Discovery grid.
                      </p>
                    </div>
                    <div
                      onClick={() =>
                        onUpdatePreferences({
                          advancedVisuals: {
                            ...advancedOpts,
                            showSearchWallpaper: !advancedOpts.showSearchWallpaper
                          }
                        })
                      }
                      className={`w-10 h-5 rounded-full p-0.5 flex cursor-pointer transition-colors ${advancedOpts.showSearchWallpaper ? 'bg-accent justify-end' : 'bg-modifier/50 justify-start'}`}
                    >
                      <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>

                  {/* Toggle: Ambience Engine */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                    <div>
                      <h5 className="text-sm font-bold text-textMain">Carousel Ambience Engine</h5>
                      <p className="text-xs text-textMuted mt-0.5">
                        Generate a dynamic background glow based on the currently focused game.
                      </p>
                    </div>
                    <div
                      onClick={() =>
                        onUpdatePreferences({
                          advancedVisuals: {
                            ...advancedOpts,
                            enableSearchAmbience: !advancedOpts.enableSearchAmbience
                          }
                        })
                      }
                      className={`w-10 h-5 rounded-full p-0.5 flex cursor-pointer transition-colors ${advancedOpts.enableSearchAmbience ? 'bg-emerald-400 justify-end' : 'bg-modifier/50 justify-start'}`}
                    >
                      <motion.div layout className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* --- PERFORMANCE SECTION --- */}
      <section className="flex flex-col gap-5">
        <h3 className="text-lg font-bold text-textMain flex items-center gap-2 border-b border-modifier/50 pb-2">
          <Zap size={18} className="text-accent" /> Engine Performance
        </h3>

        <div
          onClick={() => onUpdatePreferences({ ecoMode: !ecoMode })}
          className={`p-6 rounded-2xl border-2 cursor-pointer transition-all flex items-center justify-between group ${
            ecoMode
              ? 'border-emerald-500/50 bg-emerald-500/10'
              : 'border-modifier/30 bg-modifier/5 hover:border-modifier'
          }`}
        >
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl shrink-0 ${ecoMode ? 'bg-emerald-500/20 text-emerald-400' : 'bg-modifier/30 text-textMuted group-hover:text-textMain'}`}
            >
              <Leaf size={24} />
            </div>
            <div>
              <h4 className={`font-bold text-lg ${ecoMode ? 'text-emerald-400' : 'text-textMain'}`}>
                Hardware Eco Mode
              </h4>
              <p className="text-sm text-textMuted mt-1 max-w-xl leading-relaxed">
                Strips out expensive CSS blurs, background animations, and heavy rendering
                pipelines. Essential for maximizing framerates when running alongside heavy games on
                integrated graphics.
              </p>
            </div>
          </div>

          {/* Master Toggle Switch */}
          <div
            className={`w-14 h-7 rounded-full p-1 flex shrink-0 transition-colors shadow-inner ${ecoMode ? 'bg-emerald-500/50 justify-end' : 'bg-black/50 justify-start'}`}
          >
            <motion.div
              layout
              className={`w-5 h-5 rounded-full shadow-md ${ecoMode ? 'bg-emerald-400' : 'bg-white/30'}`}
            />
          </div>
        </div>
      </section>

      {/* --- WALLPAPER GALLERY MODAL --- */}
      <AnimatePresence>
        {galleryOpen && (
          <WallpaperGalleryModal
            currentWallpaper={settings?.preferences?.wallpaper}
            onClose={() => setGalleryOpen(false)}
            onSelect={(url) => {
              onUpdatePreferences({ wallpaper: url })
              setGalleryOpen(false)
            }}
          />
        )}
      </AnimatePresence>

      {/* --- WALLPAPER CROPPER MODAL --- */}
      <AnimatePresence>
        {cropImageSrc && (
          <WallpaperCropperModal
            imageSrc={cropImageSrc}
            onClose={() => setCropImageSrc(null)}
            onComplete={(finalUrl) => {
              onUpdatePreferences({ wallpaper: finalUrl })
              setCropImageSrc(null)
              refreshArchiveCount()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
