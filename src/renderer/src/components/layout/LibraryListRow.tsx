import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderX,
  FolderCheck,
  CloudUpload,
  Clock,
  Gamepad2,
  Trophy,
  PauseCircle,
  XCircle,
  Loader2,
  Image as ImageIcon,
  Settings,
  Trash2,
  CloudOff,
  AlertTriangle,
  CloudDownload,
  ChevronDown
} from 'lucide-react'

const STATUS_CONFIG = {
  playing: { icon: Gamepad2, color: '#4ade80', label: 'Playing' },
  completed: { icon: Trophy, color: '#c084fc', label: 'Completed' },
  dropped: { icon: XCircle, color: '#f87171', label: 'Dropped' },
  paused: { icon: PauseCircle, color: '#fb923c', label: 'Paused' },
  planned: { icon: Clock, color: '#60a5fa', label: 'Planned' }
}

export default function LibraryListRow({ game, onUpdate, onBackup, onRemoveGame }: any) {
  const [isChangingStatus, setIsChangingStatus] = useState<string | null>(null)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ isCloud: boolean } | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isFlashing, setIsFlashing] = useState(true)
  const [imgError, setImgError] = useState(false)

  const menusRef = useRef<HTMLDivElement>(null)

  // Click outside listener for both menus
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menusRef.current && !menusRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false)
        setIsStatusMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // --- ALERTS & TIMERS ---
  const activeConfig =
    STATUS_CONFIG[game.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.planned
  const isPlaying = game.status === 'playing'
  const daysSinceUpdate = (Date.now() - (game.updatedAt || Date.now())) / (1000 * 60 * 60 * 24)
  const needsBackupWarning = isPlaying && (!game.cloudSaveId || daysSinceUpdate > 3)
  const needsPathWarning = !game.savePathDesktop

  useEffect(() => {
    if (needsPathWarning) {
      setIsFlashing(true)
      const timer = setTimeout(() => setIsFlashing(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [needsPathWarning])

  // --- HANDLERS ---
  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === game.status) return
    setIsChangingStatus(newStatus)
    await new Promise((res) => setTimeout(res, 400))
    onUpdate({ ...game, status: newStatus })
    setIsChangingStatus(null)
    setIsStatusMenuOpen(false)
  }

  const handleLinkPath = async () => {
    try {
      const selectedPath = await window.api.selectFolder()
      if (selectedPath) {
        onUpdate({ ...game, savePathDesktop: selectedPath })
      }
    } catch (error) {
      console.error('Failed to link path:', error)
    } finally {
      setIsSettingsOpen(false)
    }
  }

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!game.cloudSaveId || isRestoring) return
    setIsRestoring(true)
    try {
      await window.api.restoreGameSave(game.rawgId, game.title, game.cloudSaveId)
    } catch (error) {
      console.error('Failed to restore save:', error)
    } finally {
      setIsRestoring(false)
    }
  }

  const displayImage = game.background_image || game.coverImage

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={`group relative flex items-center w-full h-[72px] rounded-xl bg-[#121212] border border-white/5 shadow-sm hover:bg-white/5 hover:border-white/10 hover:shadow-lg transition-all duration-300 ${isSettingsOpen || isStatusMenuOpen || pendingDelete ? 'z-50 ring-1 ring-white/10' : 'z-10'}`}
    >
      {/* 1. THE STATUS EDGE (Left Accent Line) */}
      <div
        className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full transition-colors duration-500"
        style={{ backgroundColor: activeConfig.color, opacity: isPlaying ? 1 : 0.5 }}
      />

      {/* 2. THUMBNAIL (16:9 Aspect Ratio) */}
      <div className="ml-4 w-24 h-14 rounded-lg overflow-hidden bg-black/50 shrink-0 relative border border-white/5">
        {!displayImage || imgError ? (
          <div className="w-full h-full flex items-center justify-center text-white/20">
            <ImageIcon size={20} />
          </div>
        ) : (
          <img
            src={displayImage}
            alt=""
            onError={() => setImgError(true)}
            className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700 ease-out"
          />
        )}
      </div>

      {/* 3. META INFO (Title & Status) */}
      <div className="flex flex-col justify-center ml-4 flex-1 min-w-0 py-2">
        <h3 className="font-extrabold text-[15px] truncate drop-shadow-sm text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-400 bg-[length:200%_auto] bg-[0%_center] group-hover:bg-[100%_center] transition-all duration-500">
          {game.title}
        </h3>

        <div className="flex items-center gap-2 mt-0.5">
          <activeConfig.icon
            size={12}
            style={{ color: activeConfig.color }}
            className="opacity-70"
          />
          <span
            className="text-[11px] font-bold tracking-wide uppercase text-white/50"
            style={{ color: activeConfig.color }}
          >
            {activeConfig.label}
          </span>
          {/* Example playtime data if you have it */}
          <span className="text-[11px] font-medium text-white/30 border-l border-white/10 pl-2">
            Updated {new Date(game.updatedAt || Date.now()).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* 4. THE ACTION DOCK (Fades in partially, pops on hover) */}
      <div
        className="flex items-center gap-2 pr-4 pl-2 opacity-60 group-hover:opacity-100 transition-opacity duration-300"
        ref={menusRef}
      >
        {/* A. Status Changer Dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsStatusMenuOpen(!isStatusMenuOpen)
              setIsSettingsOpen(false)
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${isStatusMenuOpen ? 'bg-white/10 border-white/20' : 'bg-black/40 border-white/5 hover:bg-white/10'}`}
          >
            {isChangingStatus ? (
              <Loader2 size={13} className="animate-spin text-white" />
            ) : (
              <activeConfig.icon size={13} style={{ color: activeConfig.color }} />
            )}
            <ChevronDown size={13} className="text-white/40" />
          </button>

          <AnimatePresence>
            {isStatusMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="absolute right-0 top-[calc(100%+8px)] w-[160px] p-1.5 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-xl flex flex-col gap-1 shadow-2xl z-50 origin-top-right"
              >
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                  if (key === game.status) return null
                  return (
                    <button
                      key={key}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleStatusChange(key)
                      }}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-all w-full text-left"
                    >
                      <config.icon size={14} style={{ color: config.color }} />
                      <span className="text-[11px] font-bold text-white/80">{config.label}</span>
                    </button>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-[1px] h-6 bg-white/10 mx-1" />

        {/* B. Settings Gear Dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsSettingsOpen(!isSettingsOpen)
              setIsStatusMenuOpen(false)
            }}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${isSettingsOpen ? 'bg-white/20 text-white' : 'bg-black/40 border border-white/5 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20'}`}
          >
            <Settings
              size={15}
              className={`transition-transform duration-300 ${isSettingsOpen ? 'rotate-90' : 'rotate-0'}`}
            />
            {needsPathWarning && !isSettingsOpen && (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                {isFlashing && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                )}
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </button>

          <AnimatePresence>
            {isSettingsOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="absolute right-0 top-[calc(100%+8px)] w-[220px] p-1.5 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-xl flex flex-col gap-1 shadow-2xl z-50 origin-top-right"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleLinkPath()
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-all text-left"
                >
                  {needsPathWarning ? (
                    <FolderX size={14} className="text-red-400" />
                  ) : (
                    <FolderCheck size={14} className="text-white/50" />
                  )}
                  <span className="text-[11px] font-bold text-white/80">
                    {needsPathWarning ? 'Link Save Folder' : 'Change Save Folder'}
                  </span>
                </button>
                <div className="h-[1px] w-full bg-white/10 my-0.5" />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onRemoveGame(game.rawgId, false)
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/20 transition-all text-left group/red"
                >
                  <Trash2 size={14} className="text-red-400/70 group-hover/red:text-red-400" />
                  <span className="text-[11px] font-bold text-red-400/80 group-hover/red:text-red-400">
                    Remove from Library
                  </span>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setPendingDelete({ isCloud: true })
                    setIsSettingsOpen(false)
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/20 transition-all text-left group/red"
                >
                  <CloudOff size={14} className="text-red-400/70 group-hover/red:text-red-400" />
                  <span className="text-[11px] font-bold text-red-400/80 group-hover/red:text-red-400">
                    Delete Cloud Save & Remove
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* C. Cloud Controls (Restore & Backup) */}
        <div className="flex gap-1.5 ml-1">
          <button
            onClick={handleRestore}
            disabled={!game.cloudSaveId || isRestoring}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
              !game.cloudSaveId || isRestoring
                ? 'bg-black/20 border border-transparent text-white/20 cursor-not-allowed'
                : 'bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40 hover:text-blue-300'
            }`}
          >
            {isRestoring ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <CloudDownload size={14} />
            )}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onBackup(game)
            }}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
              needsBackupWarning
                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                : 'bg-black/40 border border-white/5 text-white/50 hover:text-white hover:bg-white/10 hover:border-white/20'
            }`}
          >
            <CloudUpload size={14} className={needsBackupWarning ? 'animate-pulse' : ''} />
          </button>
        </div>
      </div>

      {/* 5. DESTRUCTIVE ACTION OVERLAY (Row-level) */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute inset-0 z-[100] bg-red-950/95 backdrop-blur-sm rounded-xl flex items-center justify-between px-6 border border-red-500/50"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4">
              <AlertTriangle size={24} className="text-red-500 animate-pulse" />
              <div>
                <h4 className="text-white font-bold text-sm">
                  Delete {pendingDelete.isCloud ? 'Cloud & Local Save' : 'from Library'}?
                </h4>
                <p className="text-red-300/70 text-[11px]">This action cannot be undone.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPendingDelete(null)}
                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onRemoveGame(game.rawgId, pendingDelete.isCloud)
                  setPendingDelete(null)
                }}
                className="px-4 py-1.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold text-xs transition-all shadow-lg shadow-red-500/20"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
