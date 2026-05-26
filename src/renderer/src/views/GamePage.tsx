import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import {
  Clock,
  Cpu,
  Star,
  Calendar,
  ArrowLeft,
  Gamepad2,
  Monitor,
  ExternalLink,
  ChevronDown,
  Plus,
  Loader2,
  HardDrive,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { STATUS_CONFIG } from './SearchView' // Reusing your existing color engine!
import GameStatusBorder from '@renderer/components/GameStatusBorder'

// Helper to strip HTML tags
const stripHtml = (html: string) => {
  const tmp = document.createElement('DIV')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

// PROPS UPDATED: Added libraryEntry and onAddGame
export default function GamePage({
  initialGame,
  source,
  libraryEntry,
  onAddGame,
  onBack
}: {
  initialGame: any
  source: 'grid' | 'hero'
  libraryEntry?: any
  onAddGame?: any
  onBack: () => void
}) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  const [fullGame, setFullGame] = useState<any>(initialGame)
  const [screenshots, setScreenshots] = useState<any[]>([])
  const [isLoadingDetails, setIsLoadingDetails] = useState(true)
  const [activeScreenshotIndex, setActiveScreenshotIndex] = useState<number | null>(null)

  const { scrollY } = useScroll()
  const yParallax = useTransform(scrollY, [0, 500], [0, 150])
  const opacityFade = useTransform(scrollY, [0, 300], [1, 0])

  useEffect(() => {
    const fetchGameData = async () => {
      setIsLoadingDetails(true)
      try {
        const [gameRes, screenRes] = await Promise.all([
          window.api.getGameDetails(initialGame.id),
          window.api.getGameScreenshots(initialGame.id).catch(() => ({ success: false }))
        ])

        if (gameRes.success) {
          setFullGame((prev: any) => ({ ...prev, ...gameRes.data }))
        }
        if (screenRes && screenRes.success) {
          setScreenshots(screenRes.data?.results || [])
        }
      } catch (error) {
        console.error('Failed to fetch game payload:', error)
      } finally {
        setIsLoadingDetails(false)
      }
    }
    if (initialGame?.id) fetchGameData()
  }, [initialGame?.id])

  const themeColor = fullGame?.dominant_color ? `#${fullGame.dominant_color}` : '#3b82f6'
  const hltbUrl = `https://howlongtobeat.com/?q=${encodeURIComponent(fullGame?.name || '')}`
  const pcgbUrl = `https://www.pcgamebenchmark.com/`

  const description =
    fullGame?.description_raw || fullGame?.description || 'No description available.'
  const pcPlatform = fullGame?.platforms?.find((p: any) => p.platform.name === 'PC')
  const reqs = pcPlatform?.requirements_en || pcPlatform?.requirements || null

  const activeStatus = libraryEntry?.status
  const statusConfig = activeStatus
    ? STATUS_CONFIG[activeStatus as keyof typeof STATUS_CONFIG]
    : null
  const statusColor = statusConfig?.color

  return (
    <div className="relative min-h-screen bg-primary selection:bg-accent/30 rounded-[2.5rem]">
      <GameStatusBorder status={libraryEntry?.status} />
      {/* --- 1. WANDERING AURORA ENGINE --- */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 mix-blend-screen opacity-40">
          {/* Node 1: Sweeps from top to mid-bottom */}
          <motion.div
            animate={{
              x: ['-15vw', '55vw', '30vw', '-10vw', '-15vw'],
              // Expanded Y: Sweeps down to 120vh (past the fold)
              y: ['-10vh', '120vh', '40vh', '80vh', '-10vh'],
              scale: [1, 1.4, 0.9, 1.2, 1],
              filter: ['hue-rotate(0deg)', 'hue-rotate(180deg)', 'hue-rotate(360deg)']
            }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute top-0 left-0 w-[60vw] h-[60vw] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(6,182,212,0.7) 0%, transparent 65%)',
              willChange: 'transform, filter'
            }}
          />

          {/* Node 2: Plunges deep behind System Requirements */}
          <motion.div
            animate={{
              x: ['55vw', '5vw', '-20vw', '45vw', '55vw'],
              // Expanded Y: Plunges deep to 150vh, then returns to top
              y: ['40vh', '150vh', '-10vh', '60vh', '40vh'],
              scale: [1.2, 0.8, 1.3, 0.9, 1.2],
              filter: ['hue-rotate(0deg)', 'hue-rotate(-180deg)', 'hue-rotate(-360deg)']
            }}
            transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}
            className="absolute top-0 left-0 w-[65vw] h-[65vw] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(139,92,246,0.7) 0%, transparent 65%)',
              willChange: 'transform, filter'
            }}
          />

          {/* Node 3: Guards the bottom of the page, rising occasionally */}
          <motion.div
            animate={{
              x: ['25vw', '60vw', '0vw', '35vw', '25vw'],
              // Expanded Y: Starts deep at 130vh, rises up, settles at bottom
              y: ['130vh', '-10vh', '70vh', '140vh', '130vh'],
              scale: [0.9, 1.5, 1, 1.4, 0.9],
              filter: ['hue-rotate(0deg)', 'hue-rotate(90deg)', 'hue-rotate(360deg)']
            }}
            transition={{ duration: 22, repeat: Infinity, ease: 'linear' }}
            className="absolute top-0 left-0 w-[55vw] h-[55vw] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(244,63,94,0.7) 0%, transparent 65%)',
              willChange: 'transform, filter'
            }}
          />
        </div>
      </div>
      {/* --- 2. TOP NAVIGATION --- */}
      <div className="fixed top-0 left-0 right-0 p-6 z-110 flex justify-between items-center bg-gradient-to-b from-primary/80 to-transparent ">
        <button
          onClick={onBack}
          className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors border border-white/10 shadow-lg cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* --- 3. PARALLAX HERO BLEED --- */}
      <div className="relative h-[65vh] w-full z-0 rounded-t-[2.5rem] overflow-hidden">
        <motion.div style={{ y: yParallax, opacity: opacityFade }} className="absolute inset-0">
          <motion.img
            layoutId={`game-image-${fullGame.id}-${source}`}
            src={fullGame.background_image}
            alt={fullGame.name}
            className="w-full h-full object-cover"
          />
        </motion.div>
        {/* <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-transparent to-transparent" /> */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-transparent to-transparent" />
      </div>

      {/* --- 4. BENTO GRID DASHBOARD --- */}
      <div className="relative z-20 max-w-6xl mx-auto px-8 -mt-40 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-end justify-between"
        >
          <div>
            <p className="text-accent font-bold tracking-wider uppercase text-sm mb-2">
              {fullGame.developers?.[0]?.name || 'Fetching Developer...'}
            </p>
            <h1 className="text-5xl md:text-6xl font-black text-white drop-shadow-2xl line-clamp-2 pb-2 leading-tight">
              {fullGame.name}
            </h1>
          </div>

          {/* THE NEW LIQUID MORPH BUTTON INJECTED HERE */}
          <LiquidMorphButton game={fullGame} libraryEntry={libraryEntry} onAddGame={onAddGame} />
        </motion.div>

        {isLoadingDetails ? (
          <div className="w-full py-32 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-accent mb-4" size={40} />
            <p className="text-textMuted font-bold animate-pulse">Decrypting secure files...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* LEFT COLUMN */}
            <div className="md:col-span-8 space-y-6">
              {screenshots.length >= 3 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="grid grid-cols-3 gap-4 h-64 md:h-[22rem]"
                >
                  <div
                    onClick={() => setActiveScreenshotIndex(0)}
                    className="col-span-2 row-span-2 rounded-3xl overflow-hidden relative group shadow-2xl border border-white/10 cursor-pointer"
                  >
                    <img
                      src={screenshots[0].image}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700"
                      alt="Gameplay 1"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                  </div>
                  <div
                    onClick={() => setActiveScreenshotIndex(1)}
                    className="rounded-2xl md:rounded-3xl overflow-hidden relative group shadow-lg border border-white/10 cursor-pointer"
                  >
                    <img
                      src={screenshots[1].image}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      alt="Gameplay 2"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                  </div>
                  <div
                    onClick={() => setActiveScreenshotIndex(2)}
                    className="rounded-2xl md:rounded-3xl overflow-hidden relative group shadow-lg border border-white/10 cursor-pointer"
                  >
                    <img
                      src={screenshots[2].image}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      alt="Gameplay 3"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                    {screenshots.length > 3 && (
                      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center transition-colors group-hover:bg-black/40">
                        <span className="text-white font-black text-xl tracking-wider">
                          +{screenshots.length - 3}
                        </span>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="p-6 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl"
              >
                <h2 className="text-xl font-bold text-white mb-4">About</h2>
                <p
                  className={`text-textMuted leading-relaxed ${!isDescriptionExpanded && 'line-clamp-4'}`}
                >
                  {stripHtml(description)}
                </p>
                {description.length > 250 && (
                  <button
                    onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                    className="mt-4 flex items-center gap-1 text-sm font-bold text-accent hover:text-white transition-colors cursor-pointer"
                  >
                    {isDescriptionExpanded ? 'Read Less' : 'Read More'}{' '}
                    <ChevronDown
                      size={16}
                      className={`transform transition-transform ${isDescriptionExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}
              </motion.div>

              {reqs && (reqs.minimum || reqs.recommended) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="p-6 md:p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-2xl relative overflow-hidden"
                >
                  <div className="absolute -top-10 -right-10 opacity-10 pointer-events-none rotate-12 text-accent">
                    <HardDrive size={200} />
                  </div>
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                    <Monitor className="text-accent" /> System Requirements
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    {reqs.minimum && (
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                        <h3 className="text-sm font-bold text-gray-300 mb-3 uppercase tracking-wider flex items-center gap-2">
                          <AlertCircle size={14} className="text-blue-400" /> Minimum
                        </h3>
                        <p className="text-sm text-textMuted leading-relaxed whitespace-pre-wrap">
                          {reqs.minimum.replace(/Minimum:|System Requirements/gi, '').trim()}
                        </p>
                      </div>
                    )}
                    {reqs.recommended && (
                      <div className="p-5 rounded-2xl bg-white/5 border border-white/5">
                        <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                          <Cpu size={14} className="text-accent" /> Recommended
                        </h3>
                        <p className="text-sm text-textMuted leading-relaxed whitespace-pre-wrap">
                          {reqs.recommended.replace(/Recommended:/gi, '').trim()}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </div>

            {/* RIGHT COLUMN */}
            <div className="md:col-span-4 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="p-6 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl flex justify-between items-center"
              >
                <div>
                  <p className="text-sm text-textMuted mb-1 flex items-center gap-1.5">
                    <Star size={14} className="text-accent" /> Rating
                  </p>
                  <p className="text-2xl font-black text-white">
                    {fullGame.rating || 'N/A'}
                    <span className="text-sm text-textMuted font-normal"> / 5</span>
                  </p>
                </div>
                <div className="w-px h-12 bg-white/10" />
                <div>
                  <p className="text-sm text-textMuted mb-1 flex items-center gap-1.5">
                    <Calendar size={14} /> Released
                  </p>
                  <p className="text-lg font-bold text-white">{fullGame.released || 'TBA'}</p>
                </div>
              </motion.div>

              <motion.a
                href={hltbUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="group block p-5 rounded-3xl bg-gradient-to-br from-[#1E2532] to-[#12161E] border border-white/5 hover:border-[#4B5E82] transition-all duration-300 hover:shadow-[0_0_30px_rgba(75,94,130,0.3)] hover:-translate-y-1 relative overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-[#4B5E82] opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-black/30 text-blue-400 border border-white/5">
                      <Clock size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">HowLongToBeat</h3>
                      <p className="text-xs text-textMuted">Check average playtimes</p>
                    </div>
                  </div>
                  <ExternalLink
                    size={16}
                    className="text-textMuted group-hover:text-blue-400 transition-colors"
                  />
                </div>
              </motion.a>

              <motion.a
                href={pcgbUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="group block p-5 rounded-3xl bg-gradient-to-br from-[#231A2F] to-[#140F1B] border border-white/5 hover:border-[#8B5CF6] transition-all duration-300 hover:shadow-[0_0_30px_rgba(139,92,246,0.2)] hover:-translate-y-1 relative overflow-hidden cursor-pointer"
              >
                <div className="absolute inset-0 bg-[#8B5CF6] opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-black/30 text-purple-400 border border-white/5">
                      <Cpu size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">PCGameBenchmark</h3>
                      <p className="text-xs text-textMuted">Test your PC specs</p>
                    </div>
                  </div>
                  <ExternalLink
                    size={16}
                    className="text-textMuted group-hover:text-purple-400 transition-colors"
                  />
                </div>
              </motion.a>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="p-6 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl"
              >
                <h2 className="text-sm font-bold text-white mb-3 uppercase tracking-wider flex items-center gap-2">
                  <Gamepad2 size={16} /> Platforms
                </h2>
                <div className="flex flex-wrap gap-2 mb-6">
                  {fullGame.platforms?.map((p: any) => (
                    <span
                      key={p.platform.id}
                      className="px-3 py-1 rounded-lg bg-black/40 border border-white/10 text-xs font-medium text-textMuted"
                    >
                      {p.platform.name}
                    </span>
                  ))}
                </div>

                <h2 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">
                  Genres
                </h2>
                <div className="flex flex-wrap gap-2">
                  {fullGame.genres?.map((g: any) => (
                    <span
                      key={g.id}
                      className="px-3 py-1 rounded-lg bg-accent/20 border border-accent/30 text-xs font-medium text-accent"
                    >
                      {g.name}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </div>

      {/* --- 5. CINEMATIC LIGHTBOX --- */}
      <AnimatePresence mode="wait">
        {activeScreenshotIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl"
          >
            <button
              onClick={() => setActiveScreenshotIndex(null)}
              className="absolute top-8 right-8 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer z-50"
            >
              <X size={24} />
            </button>
            <button
              onClick={() =>
                setActiveScreenshotIndex((prev) => (prev! > 0 ? prev! - 1 : screenshots.length - 1))
              }
              className="absolute left-8 p-4 bg-white/5 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer z-50"
            >
              <ChevronLeft size={32} />
            </button>
            <motion.img
              key={activeScreenshotIndex}
              initial={{ opacity: 0, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              src={screenshots[activeScreenshotIndex].image}
              className="max-h-[85vh] max-w-[80vw] object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)]"
              alt="Fullscreen Gameplay"
            />
            <button
              onClick={() =>
                setActiveScreenshotIndex((prev) => (prev! < screenshots.length - 1 ? prev! + 1 : 0))
              }
              className="absolute right-8 p-4 bg-white/5 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer z-50"
            >
              <ChevronRight size={32} />
            </button>
            <div className="absolute bottom-8 px-4 py-2 bg-white/10 rounded-full text-white/70 font-bold text-sm tracking-widest backdrop-blur-md">
              {activeScreenshotIndex + 1} / {screenshots.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// --- THE LIQUID MORPH BUTTON ENGINE ---
function LiquidMorphButton({ game, libraryEntry, onAddGame }: any) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isDrawing, setIsDrawing] = useState(false)
  const [localLoadingStatus, setLocalLoadingStatus] = useState<string | null>(null)
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null)
  const [targetColor, setTargetColor] = useState<string | null>(null)

  const [isHovered, setIsHovered] = useState(false)

  const activeStatus = libraryEntry?.status || optimisticStatus
  const actualConfig = activeStatus
    ? STATUS_CONFIG[activeStatus as keyof typeof STATUS_CONFIG]
    : null
  const bgColor = isDrawing
    ? targetColor
    : isExpanded
      ? 'rgba(255,255,255,0.1)'
      : actualConfig?.color || '#3b82f6'

  // FIX 1: The Reactive Grace Period
  // This completely stops the "snap shut" glitch. It gives the animation a 400ms buffer
  // before closing, ensuring it never closes accidentally when the layout shifts!
  useEffect(() => {
    let timeout: NodeJS.Timeout
    if (!isHovered && isExpanded && !localLoadingStatus && !isDrawing) {
      timeout = setTimeout(() => setIsExpanded(false), 400)
    }
    return () => clearTimeout(timeout)
  }, [isHovered, isExpanded, localLoadingStatus, isDrawing])

  const handleSelect = async (e: React.MouseEvent, statusKey: string) => {
    e.stopPropagation()
    if (!onAddGame || localLoadingStatus) return

    const config = STATUS_CONFIG[statusKey as keyof typeof STATUS_CONFIG]
    setLocalLoadingStatus(statusKey)
    setTargetColor(config.color)

    try {
      const minimumDelay = new Promise((resolve) => setTimeout(resolve, 600))
      await Promise.all([Promise.resolve(onAddGame(game, statusKey)), minimumDelay])

      setIsExpanded(false)
      setIsDrawing(true)

      await new Promise((resolve) => setTimeout(resolve, 800))
      setOptimisticStatus(statusKey)
    } finally {
      setIsDrawing(false)
      setLocalLoadingStatus(null)
      setTargetColor(null)
    }
  }

  return (
    <div className="relative flex justify-end items-center h-14" style={{ minWidth: '56px' }}>
      <motion.div
        layout
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          if (!isExpanded && !isDrawing) setIsExpanded(true)
        }}
        animate={{
          backgroundColor: bgColor as string,
          scale: isHovered && !isExpanded && !isDrawing ? 1.05 : 1
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className={`h-14 flex items-center justify-center relative overflow-hidden transition-shadow ${
          isExpanded
            ? 'backdrop-blur-2xl border border-white/10 px-2'
            : isDrawing
              ? 'w-14 px-0 shadow-2xl'
              : 'px-8 cursor-pointer shadow-[0_0_30px_rgba(0,0,0,0.3)]'
        }`}
        style={{ borderRadius: isDrawing ? '28px' : '16px' }}
      >
        {/* The Magnetic Glare */}
        {!isExpanded && !isDrawing && (
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 z-0 pointer-events-none"
            initial={{ x: '-150%' }}
            animate={{ x: isHovered ? '150%' : '-150%' }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
          />
        )}

        {/* FIX 2: mode="popLayout" perfectly overlaps the text fading out while icons fade in */}
        <AnimatePresence mode="popLayout" initial={false}>
          {isDrawing ? (
            <motion.div
              layout="position"
              key="drawing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-center w-14 h-14 relative z-10 flex-shrink-0"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
                  d="M20 6L9 17l-5-5"
                />
              </svg>
            </motion.div>
          ) : isExpanded ? (
            <motion.div
              layout="position" // Prevents the icons from "stretching" while the background grows
              key="expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 h-14 relative z-10 flex-shrink-0"
            >
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const isLoading = localLoadingStatus === key
                const isOtherLoading = localLoadingStatus && !isLoading
                return (
                  <motion.button
                    key={key}
                    onClick={(e) => handleSelect(e, key)}
                    disabled={localLoadingStatus !== null}
                    whileHover={!localLoadingStatus ? { scale: 1.15 } : {}}
                    whileTap={!localLoadingStatus ? { scale: 0.9 } : {}}
                    animate={{ opacity: isOtherLoading ? 0.3 : 1 }}
                    className={`w-10 h-10 rounded-full cursor-pointer flex items-center justify-center transition-colors flex-shrink-0 ${localLoadingStatus ? '' : 'hover:bg-white/20'}`}
                    style={{ color: config.color }}
                    title={config.label}
                  >
                    {isLoading ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <config.icon size={20} />
                    )}
                  </motion.button>
                )
              })}
            </motion.div>
          ) : (
            <motion.div
              layout="position" // Prevents the text from stretching out in a glitchy way!
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 text-white font-bold whitespace-nowrap relative z-10 flex-shrink-0"
            >
              {actualConfig ? (
                <>
                  <actualConfig.icon size={20} />
                  {actualConfig.label}
                </>
              ) : (
                <>
                  <Plus size={20} strokeWidth={3} />
                  Add to Library
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
