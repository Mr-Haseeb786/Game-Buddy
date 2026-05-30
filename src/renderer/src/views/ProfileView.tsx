import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import {
  User,
  Camera,
  Link as LinkIcon,
  HardDrive,
  Cloud,
  CloudOff,
  CloudDrizzle,
  AlertTriangle,
  CheckCircle2,
  Gamepad2,
  ShieldCheck,
  Loader2,
  Grid
} from 'lucide-react'
import { GameEntry } from 'src/shared/types'
import AvatarCropModal from '@renderer/components/AvatarCropModal'
import AvatarGalleryModal from '@renderer/components/AvatarGalleryModal'

// A smooth counter component for AAA telemetry stats
const AnimatedCounter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let start = 0
    const end = value
    if (start === end) return
    const duration = 1000
    const incrementTime = Math.abs(Math.floor(duration / end))

    const timer = setInterval(() => {
      start += 1
      setDisplayValue(start)
      if (start === end) clearInterval(timer)
    }, incrementTime)
    return () => clearInterval(timer)
  }, [value])

  return (
    <span>
      {displayValue}
      {suffix}
    </span>
  )
}

export default function ProfileView({
  library,
  onUpdateProfile,
  isAuthenticated,
  isAuthenticating,
  syncState,
  onGoogleLogin,
  onGoogleLogout,
  onManageStorage,
  onCancelAuth,
  settings
}: any) {
  const profile = settings?.userProfile || { name: 'Player One', avatar: '' }
  const gamesList = Object.values(library?.games || {}) as GameEntry[]

  // --- UI STATES ---
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState(profile.name)
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false)
  const [urlInputOpen, setUrlInputOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isDownloading, setIsDownloading] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [galleryOpen, setGalleryOpen] = useState(false)

  useEffect(() => {
    if (showLogoutConfirm) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [showLogoutConfirm])

  const inputRef = useRef<HTMLInputElement>(null)

  // --- DYNAMIC TELEMETRY MATH ---
  const stats = useMemo(() => {
    const total = gamesList.length
    const completed = gamesList.filter((g: any) => g.status === 'completed').length
    const backedUp = gamesList.filter((g: any) => g.cloudSaveId).length

    const recent =
      gamesList.length > 0 ? [...gamesList].sort((a, b) => b.updatedAt - a.updatedAt)[0] : undefined

    return {
      total,
      completionRate: total === 0 ? 0 : Math.round((completed / total) * 100),
      backupHealth: total === 0 ? 0 : Math.round((backedUp / total) * 100),
      // Find the most recently updated game to use as the hero background
      recentGame: recent
    }
  }, [gamesList])

  // --- HANDLERS ---
  const handleNameSave = () => {
    setIsEditingName(false)
    if (tempName.trim() && tempName !== profile.name) {
      onUpdateProfile({ name: tempName.trim() })
    } else {
      setTempName(profile.name)
    }
  }

  const handleLocalAvatar = async () => {
    setAvatarMenuOpen(false)
    const localPath = await window.api.selectAvatar()

    if (localPath) {
      // SMART BYPASS: If it's a GIF, skip canvas cropping so we don't lose the animation!
      if (localPath.toLowerCase().endsWith('.gif')) {
        onUpdateProfile({ avatar: localPath })
      } else {
        setCropImageSrc(localPath)
      }
    }
  }

  const handleUrlAvatar = async () => {
    if (!avatarUrl.trim()) return
    setIsDownloading(true)

    const cachedPath = await window.api.downloadAvatarUrl(avatarUrl.trim())

    if (cachedPath) {
      // SMART BYPASS: If it's a GIF, skip canvas cropping so we don't lose the animation!
      if (cachedPath.toLowerCase().endsWith('.gif')) {
        onUpdateProfile({ avatar: cachedPath })
      } else {
        setCropImageSrc(cachedPath)
      }
      setUrlInputOpen(false)
      setAvatarUrl('')
    } else {
      alert('Failed to download image. Check the URL.')
    }

    setIsDownloading(false)
  }

  // --- CLOUD UI RENDERER ---
  const cloudUI = useMemo(() => {
    if (!isAuthenticated)
      return {
        icon: CloudOff,
        color: 'text-gray-500',
        bg: 'bg-gray-500/10',
        border: 'border-gray-500/20',
        text: 'Offline'
      }
    if (syncState === 'syncing')
      return {
        icon: CloudDrizzle,
        color: 'text-blue-400',
        bg: 'bg-blue-400/10',
        border: 'border-blue-400/20',
        text: 'Syncing...',
        pulse: true
      }
    if (syncState === 'error')
      return {
        icon: AlertTriangle,
        color: 'text-red-500',
        bg: 'bg-red-500/10',
        border: 'border-red-500/20',
        text: 'Sync Error'
      }
    return {
      icon: Cloud,
      color: 'text-green-400',
      bg: 'bg-green-400/10',
      border: 'border-green-400/20',
      text: 'Secured'
    }
  }, [isAuthenticated, syncState])

  return (
    <div className="w-full min-h-screen bg-[#0a0a0a] pb-20">
      {/* --- 1. HERO IDENTITY BANNER --- */}
      <div className="relative h-[300px] w-full flex items-end">
        {/* Parallax Background (overflow-hidden moved here!) */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {stats.recentGame?.background_image ? (
            <>
              <img
                src={stats.recentGame.background_image}
                className="w-full h-full object-cover opacity-40 scale-105 transform translate-y-[-10%]"
                alt="Banner"
              />
              {/* Complex gradient to blend into the background */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/80 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-transparent to-transparent opacity-80" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-900/40 to-[#0a0a0a]" />
          )}
        </div>

        {/* User Identity Container */}
        <div className="relative z-10 w-full max-w-6xl mx-auto px-8 pb-8 flex items-end gap-8">
          {/* Animated Avatar Picker */}
          <div className="relative group shrink-0">
            <div className="w-32 h-32 rounded-3xl overflow-hidden bg-[#171717] border-2 border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.8)] relative">
              {profile.avatar ? (
                <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <User size={48} />
                </div>
              )}

              {/* Glassmorphism Hover Overlay */}
              <button
                onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center cursor-pointer"
              >
                <Camera
                  size={28}
                  className="text-white drop-shadow-lg scale-75 group-hover:scale-100 transition-transform duration-300"
                />
              </button>
            </div>

            {/* Avatar Context Menu */}
            <AnimatePresence>
              {avatarMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-[calc(100%+12px)] left-0 w-48 bg-[#171717] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                >
                  <button
                    onClick={handleLocalAvatar}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <HardDrive size={16} /> Upload File
                  </button>
                  <button
                    onClick={() => {
                      setUrlInputOpen(true)
                      setAvatarMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <LinkIcon size={16} /> Paste GIF/Image Link
                  </button>
                  <div className="h-[1px] w-full bg-white/5 my-1" />

                  {/* NEW: Browse Archive Button */}
                  <button
                    onClick={() => {
                      setGalleryOpen(true)
                      setAvatarMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-accent hover:bg-white/10 transition-colors font-medium"
                  >
                    <Grid size={16} /> Browse Archive
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Editable Name Display */}
          <div className="flex flex-col mb-2 flex-1">
            <span className="text-accent text-xs font-bold tracking-[0.2em] uppercase mb-1 drop-shadow-md">
              Agent Profile
            </span>
            {isEditingName ? (
              <input
                ref={inputRef}
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                className="bg-transparent text-5xl font-black text-white focus:outline-none focus:ring-0 w-full caret-accent animate-pulse"
                autoFocus
                maxLength={24}
              />
            ) : (
              <h1
                onClick={() => setIsEditingName(true)}
                className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-gray-400 hover:from-white hover:to-white cursor-pointer transition-all w-max drop-shadow-xl pb-2 leading-tight"
              >
                {profile.name}
              </h1>
            )}
          </div>
        </div>
      </div>

      {/* --- URL INPUT MODAL --- */}
      <AnimatePresence>
        {urlInputOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-[#121212] p-6 rounded-2xl border border-white/10 w-full max-w-md shadow-2xl"
            >
              <h3 className="text-white font-bold mb-4">Paste Image/GIF URL</h3>
              <input
                type="text"
                placeholder="https://..."
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-accent focus:outline-none mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setUrlInputOpen(false)}
                  className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUrlAvatar}
                  disabled={isDownloading || !avatarUrl}
                  className="flex-1 py-2 rounded-lg bg-accent hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2"
                >
                  {isDownloading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    'Download & Set'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-8 mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* --- 2. THE TELEMETRY RIBBON --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 grid grid-cols-3 gap-4"
        >
          {/* Stat Block 1 */}
          <div className="bg-[#121212] border border-white/5 rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute right-0 top-0 opacity-5 text-white/50 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
              <Gamepad2 size={120} />
            </div>
            <span className="text-white/40 font-bold text-xs uppercase tracking-wider mb-2">
              Total Games
            </span>
            <span className="text-4xl font-black text-white">
              <AnimatedCounter value={stats.total} />
            </span>
          </div>

          {/* Stat Block 2 */}
          <div className="bg-[#121212] border border-white/5 rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute right-0 top-0 opacity-5 text-white/50 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
              <CheckCircle2 size={120} />
            </div>
            <span className="text-white/40 font-bold text-xs uppercase tracking-wider mb-2">
              Completion Rate
            </span>
            <span className="text-4xl font-black text-[#c084fc]">
              <AnimatedCounter value={stats.completionRate} suffix="%" />
            </span>
          </div>

          {/* Stat Block 3 */}
          <div className="bg-[#121212] border border-white/5 rounded-2xl p-6 flex flex-col justify-center relative overflow-hidden group">
            <div className="absolute right-0 top-0 opacity-5 text-white/50 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
              <ShieldCheck size={120} />
            </div>
            <span className="text-white/40 font-bold text-xs uppercase tracking-wider mb-2">
              Save Health
            </span>
            <span className="text-4xl font-black text-emerald-400">
              <AnimatedCounter value={stats.backupHealth} suffix="%" />
            </span>
          </div>
        </motion.div>

        {/* --- 3. CLOUD COMMAND CENTER --- */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1 bg-[#121212] border border-white/5 rounded-2xl p-6 flex flex-col shadow-lg relative overflow-hidden"
        >
          <div className="flex items-center gap-4 mb-6 relative z-10">
            <div
              className={`p-3 rounded-xl border ${cloudUI.bg} ${cloudUI.border} ${cloudUI.color} ${cloudUI.pulse ? 'animate-pulse' : ''}`}
            >
              <cloudUI.icon size={24} />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg leading-tight">Drive Uplink</h3>
              <p className={`text-xs font-bold mt-0.5 ${cloudUI.color}`}>{cloudUI.text}</p>
            </div>
          </div>

          <div className="flex-1" />

          <div className="flex flex-col gap-2 relative z-10">
            {isAuthenticated ? (
              <>
                <button
                  onClick={onManageStorage}
                  className="w-full cursor-pointer py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold text-sm transition-all border border-white/5 shadow-sm"
                >
                  Manage Storage
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="w-full cursor-pointer py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm transition-all border border-red-500/20"
                >
                  Sever Uplink
                </button>
              </>
            ) : isAuthenticating ? (
              <div className="flex gap-2">
                <button
                  onClick={onCancelAuth}
                  className="w-1/3 cursor-pointer py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-sm transition-all border border-red-500/20 flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  disabled
                  className="flex-1 py-3 rounded-xl bg-blue-600/40 text-white/60 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <Loader2 size={16} className="animate-spin" /> Waiting...
                </button>
              </div>
            ) : (
              <button
                onClick={onGoogleLogin}
                className="w-full cursor-pointer py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] flex items-center justify-center gap-2"
              >
                Establish Secure Uplink
              </button>
            )}
          </div>
        </motion.div>
      </div>
      {/* --- AVATAR CROPPER MODAL --- */}
      <AnimatePresence>
        {cropImageSrc && (
          <AvatarCropModal
            imageSrc={cropImageSrc}
            onClose={() => setCropImageSrc(null)}
            onComplete={async (base64Data) => {
              // 1. Send the base64 string to the backend to save as a PNG
              const finalPath = await window.api.saveCroppedAvatar(base64Data)
              if (finalPath) {
                // 2. Update the profile with the final permanent path
                onUpdateProfile({ avatar: finalPath })
              }
              // 3. Close the cropper
              setCropImageSrc(null)
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {galleryOpen && (
          <AvatarGalleryModal
            currentAvatar={profile.avatar}
            onClose={() => setGalleryOpen(false)}
            onSelect={(url) => {
              onUpdateProfile({ avatar: url })
              setGalleryOpen(false)
            }}
          />
        )}
      </AnimatePresence>
      {/* --- SEVER UPLINK CONFIRMATION MODAL (PORTALED) --- */}
      {/* FIX: createPortal must wrap AnimatePresence, not the other way around! */}
      {createPortal(
        <AnimatePresence>
          {showLogoutConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 w-screen h-screen z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 pointer-events-auto"
              onClick={() => setShowLogoutConfirm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#121212] border border-red-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(239,68,68,0.2)] max-w-md w-full text-center"
              >
                <div className="flex justify-center mb-4">
                  <div className="p-4 rounded-full bg-red-500/10 text-red-500">
                    <AlertTriangle size={32} className="animate-pulse" />
                  </div>
                </div>

                <h3 className="text-xl font-black text-white mb-2">Sever Drive Uplink?</h3>
                <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                  You are about to disconnect your Google Drive account. Your local library will
                  remain safely on this device, but future saves will{' '}
                  <strong className="text-red-400">no longer be backed up to the cloud</strong>.
                </p>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowLogoutConfirm(false)
                      onGoogleLogout()
                    }}
                    className="flex-1 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 hover:text-red-300 font-bold text-sm transition-all shadow-[0_0_15px_rgba(239,68,68,0.2)] cursor-pointer"
                  >
                    Confirm Disconnect
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  )
}
