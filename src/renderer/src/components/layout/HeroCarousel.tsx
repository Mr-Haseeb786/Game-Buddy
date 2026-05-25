import { useState, useEffect } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { Star, Calendar, Check } from 'lucide-react'
import { STATUS_CONFIG, InteractiveLibraryPill } from '../../views/SearchView'

interface Game {
  id: number
  name: string
  background_image: string
  rating: number
  released: string
  genres?: { name: string }[]
}

interface HeroCarouselProps {
  games: Game[]
  isLoading: boolean
  searchQuery: string
  libraryData?: Record<number, any>
  onAddGame?: (game: Game, status: string) => void
  onGameClick?: (game: Game, source: 'grid' | 'hero') => void
}

// Vibrant colors matching game vibes
const ambienceColors = [
  'rgba(59, 130, 246, 0.4)', // Blue (GTA V)
  'rgba(168, 85, 247, 0.4)', // Purple
  'rgba(239, 68, 68, 0.4)', // Red
  'rgba(249, 115, 22, 0.4)', // Orange
  'rgba(34, 197, 94, 0.4)' // Green
]

// --- ANIMATION VARIANTS (The Secret to the "Push") ---
const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 1,
    scale: 0.98
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 1,
    scale: 0.98
  })
}

const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min
}

export default function HeroCarousel({
  games,
  isLoading,
  searchQuery,
  libraryData = {},
  onAddGame,
  onGameClick
}: HeroCarouselProps) {
  const [[page, direction], setPage] = useState([0, 0])

  const gamesToDisplay = games.slice(0, 5)

  const heroIndex = gamesToDisplay.length > 0 ? wrap(0, gamesToDisplay.length, page) : 0
  const currentHero = gamesToDisplay[heroIndex]
  const currentColor = ambienceColors[heroIndex % ambienceColors.length]

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection])
  }

  useEffect(() => {
    if (gamesToDisplay.length <= 1 || searchQuery) return
    const interval = setInterval(() => {
      paginate(1)
    }, 6000)
    return () => clearInterval(interval)
  }, [gamesToDisplay, searchQuery, page])

  useEffect(() => {
    const globalGlow = currentColor.replace('0.4', '0.3')
    document.documentElement.style.setProperty('--app-active-ambiance', globalGlow)

    return () => {
      document.documentElement.style.removeProperty('--app-active-ambiance')
    }
  }, [currentColor])

  const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity
  const handleDragEnd = (e: any, { offset, velocity }: PanInfo) => {
    const swipe = swipePower(offset.x, velocity.x)
    const swipeConfidenceThreshold = 10000

    if (swipe < -swipeConfidenceThreshold) {
      paginate(1)
    } else if (swipe > swipeConfidenceThreshold) {
      paginate(-1)
    }
  }

  if (isLoading) return <HeroSkeleton />
  if (!currentHero || searchQuery) return null

  return (
    <motion.div
      animate={{
        boxShadow: `0px 20px 120px -20px ${currentColor}`,
        borderColor: currentColor.replace('0.4', '0.2')
      }}
      transition={{ duration: 1.5, ease: 'easeInOut' }}
      className="relative h-[28rem] rounded-[2rem] bg-primary border-2 shadow-2xl transition-all"
    >
      <div className="absolute inset-0 rounded-[2rem] overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          {/* THE SLIDE COMPONENT: Extracted so it can manage its own optimistic animation state */}
          <HeroSlide
            key={page}
            game={currentHero}
            direction={direction}
            libraryEntry={libraryData[currentHero.id]}
            onAddGame={onAddGame}
            handleDragEnd={handleDragEnd}
            onGameClick={onGameClick}
          />
        </AnimatePresence>
      </div>

      {/* Progress Indicators */}
      <div className="absolute bottom-6 right-10 flex gap-2 z-20 select-none">
        {gamesToDisplay.map((_, i) => (
          <div
            key={i}
            onClick={() => {
              const diff = i - heroIndex
              if (diff !== 0) paginate(diff)
            }}
            className={`cursor-pointer h-1.5 rounded-full transition-all duration-500 ${
              i === heroIndex
                ? 'w-8 bg-white shadow-[0_0_10px_white]'
                : 'w-2 bg-white/30 hover:bg-white/50'
            }`}
          />
        ))}
      </div>
    </motion.div>
  )
}

// --- THE INDIVIDUAL SLIDE ENGINE ---
function HeroSlide({ game, direction, libraryEntry, onAddGame, handleDragEnd, onGameClick }: any) {
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null)
  const [localLoadingStatus, setLocalLoadingStatus] = useState<string | null>(null)

  const activeStatus = libraryEntry?.status || optimisticStatus
  const actualStatusConfig = activeStatus
    ? STATUS_CONFIG[activeStatus as keyof typeof STATUS_CONFIG]
    : null

  const isAdded = !!activeStatus
  const showBadge = isAdded && !localLoadingStatus
  const showPill = !isAdded || localLoadingStatus

  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{
        x: { type: 'spring', stiffness: 300, damping: 30 },
        opacity: { duration: 0.2 },
        scale: { duration: 0.4 }
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      onDragEnd={handleDragEnd}
      className="absolute inset-0 cursor-grab active:cursor-grabbing bg-primary z-10"
    >
      <motion.img
        layoutId={`game-image-${game.id}-hero`} // <-- ADD '-hero' HERE
        src={game.background_image}
        alt={game.name}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent opacity-80 pointer-events-none" />

      {/* --- TOP RIGHT CORNER: BADGE DESTINATION --- */}
      <div className="absolute top-6 right-8 flex items-center gap-3 z-30 pointer-events-none">
        <AnimatePresence>
          {showBadge && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-lg text-sm font-bold text-white flex items-center gap-1.5 shadow-lg border border-white/10"
            >
              <Check size={16} strokeWidth={3} className="text-accent" /> In Library
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showBadge && actualStatusConfig && (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg border border-white/10"
              style={{ color: actualStatusConfig.color }}
            >
              {/* The Destination layoutId */}
              <motion.div
                layoutId={`status-icon-${game.id}-${activeStatus}-hero`}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <actualStatusConfig.icon size={16} />
              </motion.div>

              <motion.span className="whitespace-nowrap">{actualStatusConfig.label}</motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute inset-0 p-10 flex flex-col justify-end w-2/3 pointer-events-none select-none">
        <h1 className="text-5xl font-black text-white mb-3 drop-shadow-lg tracking-tight line-clamp-2">
          {game.name}
        </h1>
        <div className="flex items-center gap-4 text-sm font-medium text-textMuted mb-6">
          <span className="flex items-center gap-1.5">
            <Star size={16} className="text-accent" /> {game.rating}
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar size={16} /> {game.released?.split('-')[0] || 'TBA'}
          </span>
        </div>

        {/* --- THE MEDIA DECK --- */}
        <div className="flex items-center gap-4 pointer-events-auto h-12">
          <button
            onClick={() => onGameClick?.(game, 'hero')}
            className="px-8 h-full bg-accent hover:bg-accentHover text-white rounded-xl font-bold shadow-[0_0_20px_rgba(var(--app-active-ambiance),0.5)] transition-all transform hover:-translate-y-0.5 active:scale-95"
          >
            View Details
          </button>

          {showPill && (
            <div className="relative z-50">
              <InteractiveLibraryPill
                game={game}
                onAddGame={onAddGame}
                localLoadingStatus={localLoadingStatus}
                setLocalLoadingStatus={setLocalLoadingStatus}
                setOptimisticStatus={setOptimisticStatus}
                layoutIdSuffix="-hero" // Separates the carousel flight path from the grid!
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function HeroSkeleton() {
  return (
    <div className="relative h-[28rem] rounded-[2rem] overflow-hidden bg-primary animate-pulse border border-modifier/30">
      <div className="absolute inset-0 p-10 flex flex-col justify-end w-2/3 space-y-4">
        <div className="h-10 bg-modifier/50 rounded w-2/3" />
        <div className="h-4 bg-modifier/50 rounded w-1/3" />
        <div className="h-12 bg-modifier/50 rounded-xl w-32 mt-4" />
      </div>
    </div>
  )
}
