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
  CloudDownload
} from 'lucide-react'

const STATUS_CONFIG = {
  playing: { icon: Gamepad2, color: '#4ade80', label: 'Playing' },
  completed: { icon: Trophy, color: '#c084fc', label: 'Completed' },
  dropped: { icon: XCircle, color: '#f87171', label: 'Dropped' },
  paused: { icon: PauseCircle, color: '#fb923c', label: 'Paused' },
  planned: { icon: Clock, color: '#60a5fa', label: 'Planned' }
}

export default function LibraryGridCard({ game, onUpdate, onBackup, onRemoveGame }: any) {
  const [isChangingStatus, setIsChangingStatus] = useState<string | null>(null)
  const [isPillHovered, setIsPillHovered] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<{ isCloud: boolean } | null>(null)

  const [isFlashing, setIsFlashing] = useState(true)

  const [isRestoring, setIsRestoring] = useState(false)

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation()
    // Safety check: Prevent clicking if already restoring or no cloud save exists
    if (!game.cloudSaveId || isRestoring) return

    setIsRestoring(true)
    try {
      // Calls your exact backend handler
      const success = await window.api.restoreGameSave(game.rawgId, game.title, game.cloudSaveId)
      if (success) {
        console.log(`Successfully restored ${game.title}!`)
      }
    } catch (error) {
      console.error('Failed to restore save:', error)
    } finally {
      setIsRestoring(false)
    }
  }

  const settingsRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node))
        setIsSettingsOpen(false)
    }
    if (isSettingsOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isSettingsOpen])

  // --- SMART ALERT LOGIC ---
  const activeConfig =
    STATUS_CONFIG[game.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.planned
  const isPlaying = game.status === 'playing'
  const daysSinceUpdate = (Date.now() - (game.updatedAt || Date.now())) / (1000 * 60 * 60 * 24)
  const needsBackupWarning = isPlaying && (!game.cloudSaveId || daysSinceUpdate > 3)
  const needsPathWarning = !game.savePathDesktop

  useEffect(() => {
    if (needsPathWarning) {
      setIsFlashing(true) // Reset animation if warning triggers again
      const timer = setTimeout(() => setIsFlashing(false), 5000)
      return () => clearTimeout(timer) // Cleanup prevents memory leaks
    }
  }, [needsPathWarning])

  // --- ACTION HANDLERS ---
  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === game.status) return
    setIsChangingStatus(newStatus)
    await new Promise((res) => setTimeout(res, 400))
    onUpdate({ ...game, status: newStatus })
    setIsChangingStatus(null)
    setIsPillHovered(false)
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

  const displayImage = game.background_image || game.coverImage

  return (
    <motion.div
      layout
      className={`group relative h-[320px] rounded-2xl bg-[#171717] shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all ${isSettingsOpen || isPillHovered ? 'z-50' : 'z-10 hover:z-40'}`}
    >
      {/* 1. LAYER 1: CLIPPED BACKGROUNDS */}
      <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 w-[150%] h-[150%] -translate-x-1/2 -translate-y-1/2 bg-[linear-gradient(#ff2288,#387ef0)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 [animation:spin_8s_linear_infinite] group-hover:[animation-play-state:running] [animation-play-state:paused] z-0" />
        <div className="absolute inset-[2px] bg-[#0a0a0a] rounded-[14px] overflow-hidden z-10">
          {!displayImage || imgError ? (
            <div className="w-full h-full bg-gradient-to-br from-white/5 to-transparent flex flex-col items-center justify-center text-white/10">
              <ImageIcon size={48} className="mb-2 opacity-50" />
            </div>
          ) : (
            <img
              src={displayImage}
              alt=""
              onError={() => setImgError(true)}
              className="w-full h-full object-cover opacity-50 group-hover:scale-110 group-hover:opacity-70 transition-all duration-[800ms] ease-out"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent opacity-90" />
        </div>
      </div>

      {/* 2. LAYER 2: UNCLIPPED UI FOREGROUND */}
      <div
        className="absolute left-1 top-1/2 -translate-y-1/2 z-50 flex items-center justify-center"
        onMouseEnter={() => setIsPillHovered(true)}
        onMouseLeave={() => setIsPillHovered(false)}
      >
        <motion.div
          layout
          className="flex flex-col bg-black/80 backdrop-blur-xl border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.8)] overflow-hidden"
          style={{ borderRadius: isPillHovered ? 16 : 12, padding: isPillHovered ? 8 : 0 }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {!isPillHovered ? (
              <motion.div
                key="dormant"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="w-10 h-10 flex items-center justify-center "
              >
                <motion.div layoutId={`icon-${game.rawgId}-${game.status}`}>
                  {isChangingStatus ? (
                    <Loader2 size={18} className="animate-spin text-white" />
                  ) : (
                    <activeConfig.icon size={18} style={{ color: activeConfig.color }} />
                  )}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="expanded"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col gap-2"
              >
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                  const isActive = key === game.status
                  const isChangingThis = isChangingStatus === key

                  return (
                    <div key={key} className="relative group/btn flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleStatusChange(key)
                        }}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300 hover:scale-110 ${isActive ? 'bg-white/10' : 'hover:bg-white/5'} cursor-pointer`}
                      >
                        <motion.div layoutId={`icon-${game.rawgId}-${key}`}>
                          {isChangingThis ? (
                            <Loader2 size={18} className="animate-spin text-white" />
                          ) : (
                            <config.icon
                              size={18}
                              style={{ color: isActive ? config.color : '#666' }}
                              className={`transition-colors ${!isActive && 'group-hover/btn:text-white'}`}
                            />
                          )}
                        </motion.div>
                      </button>
                      <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-black text-white text-xs font-bold rounded-lg opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all duration-200 whitespace-nowrap pointer-events-none shadow-lg border border-white/10 z-50">
                        {config.label}
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* 3. BOTTOM BAR - Dynamic Z-Index Fix */}
      {/* FIX: Shifts to z-[60] when the menu opens so it completely covers the z-50 Status Pill */}
      <div
        className={`absolute bottom-[2px] left-[2px] right-[2px] p-4 flex flex-col justify-end transition-all ${isSettingsOpen ? 'z-[60]' : 'z-20'}`}
      >
        <div className="flex items-center justify-between w-full mb-3">
          <div className="relative shrink-0" ref={settingsRef}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsSettingsOpen(!isSettingsOpen)
              }}
              className={`flex items-center cursor-pointer justify-center w-8 h-8 rounded-xl transition-all shadow-lg ${isSettingsOpen ? 'bg-white/20 text-white' : 'bg-black/40 border border-white/10 text-white/50 hover:text-white hover:bg-white/20'}`}
            >
              <Settings
                size={15}
                className={`transition-transform duration-300 ${isSettingsOpen ? 'rotate-90' : 'rotate-0'}`}
              />
              {needsPathWarning && !isSettingsOpen && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  {isFlashing && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  )}
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]"></span>
                </span>
              )}
            </button>

            <AnimatePresence>
              {isSettingsOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 15, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  className="absolute bottom-[calc(100%+8px)] left-0 w-[240px] p-1.5 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-xl flex flex-col gap-1 shadow-[0_0_30px_rgba(0,0,0,0.8)] z-50 origin-bottom-left"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleLinkPath()
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-all w-full text-left cursor-pointer group/opt"
                  >
                    {needsPathWarning ? (
                      <FolderX
                        size={15}
                        className="text-red-400 group-hover/opt:scale-110 transition-transform"
                      />
                    ) : (
                      <FolderCheck
                        size={15}
                        className="text-white/50 group-hover/opt:text-white group-hover/opt:scale-110 transition-all"
                      />
                    )}
                    <span className="text-xs font-bold text-white/80 group-hover/opt:text-white">
                      {needsPathWarning ? 'Link Save Folder' : 'Change Save Folder'}
                    </span>
                  </button>

                  <div className="h-[1px] w-full bg-white/10 my-1" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemoveGame(game.rawgId, false)
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/20 transition-all w-full text-left cursor-pointer group/opt"
                  >
                    <Trash2
                      size={15}
                      className="text-red-400/70 group-hover/opt:text-red-400 group-hover/opt:scale-110 transition-all"
                    />
                    <span className="text-xs font-bold text-red-400/80 group-hover/opt:text-red-400">
                      Remove from Library
                    </span>
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setPendingDelete({ isCloud: true })
                      setIsSettingsOpen(false)
                    }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/20 transition-all w-full text-left cursor-pointer group/opt"
                  >
                    <CloudOff
                      size={15}
                      className="text-red-400/70 group-hover/opt:text-red-400 group-hover/opt:scale-110 transition-all"
                    />
                    <span className="text-xs font-bold text-red-400/80 group-hover/opt:text-red-400">
                      Delete Cloud Save & Remove
                    </span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            {/* NEW: Restore Button */}
            <button
              onClick={handleRestore}
              disabled={!game.cloudSaveId || isRestoring}
              title={!game.cloudSaveId ? 'No cloud save available' : 'Restore from Cloud'}
              className={`flex items-center justify-center w-8 h-8 rounded-xl backdrop-blur-md border transition-all shadow-lg ${
                !game.cloudSaveId || isRestoring
                  ? 'bg-black/20 border-white/5 text-white/20 cursor-not-allowed'
                  : 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:border-blue-500/40 hover:text-blue-300 cursor-pointer hover:scale-105 active:scale-95'
              }`}
            >
              {isRestoring ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <CloudDownload size={15} />
              )}
            </button>

            {/* EXISTING: Backup Button */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onBackup(game)
              }}
              title={needsBackupWarning ? 'Backup Recommended' : 'Backup to Cloud'}
              className={`flex items-center cursor-pointer justify-center w-8 h-8 rounded-xl backdrop-blur-md border transition-all shadow-lg hover:scale-105 active:scale-95 ${
                needsBackupWarning
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30 hover:border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-black/40 border-white/10 text-white/50 hover:text-white hover:bg-white/20'
              }`}
            >
              <CloudUpload size={15} className={needsBackupWarning ? 'animate-pulse' : ''} />
            </button>
          </div>
        </div>

        <div className="w-full">
          <h3 className="text-white/95 font-extrabold text-[15px] leading-snug line-clamp-2 break-words drop-shadow-lg shadow-black group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
            {game.title}
          </h3>
        </div>
      </div>

      {/* 5. THE DESTRUCTIVE ACTION OVERLAY */}
      {/* This sits on top of everything inside the card when a deletion is triggered */}
      <AnimatePresence>
        {pendingDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center"
            onClick={(e) => e.stopPropagation()} // Prevent clicking the card behind it
          >
            <AlertTriangle
              size={36}
              className="text-red-500 mb-3 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]"
            />
            <h4 className="text-white font-black text-xl mb-2">Are you sure?</h4>

            <p className="text-gray-400 text-[13px] leading-relaxed mb-6 font-medium">
              {pendingDelete.isCloud
                ? 'This will permanently delete your zipped save from Google Drive and remove the game from your local library. This cannot be undone.'
                : 'This will remove the game from your library tracking. Your physical save files will remain safely on your computer.'}
            </p>

            <div className="flex w-full gap-3">
              <button
                onClick={() => setPendingDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onRemoveGame(game.rawgId, pendingDelete.isCloud)
                  setPendingDelete(null)
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-sm transition-all shadow-lg hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] cursor-pointer"
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
