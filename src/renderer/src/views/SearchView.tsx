import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search as SearchIcon,
  Loader2,
  ChevronRight,
  Star,
  Calendar,
  Plus,
  Check,
  Gamepad2,
  Trophy,
  PauseCircle,
  XCircle,
  Clock
} from 'lucide-react'
import HeroCarousel from '../components/layout/HeroCarousel'

import { FaWindows, FaPlaystation, FaXbox, FaApple, FaLinux, FaAndroid } from 'react-icons/fa'
import { BsNintendoSwitch } from 'react-icons/bs'
import { MdPhoneIphone } from 'react-icons/md'

// --- THE STATUS COLOR ENGINE ---
export const STATUS_CONFIG = {
  playing: { icon: Gamepad2, color: '#4ade80', label: 'Playing' },
  completed: { icon: Trophy, color: '#c084fc', label: 'Completed' },
  dropped: { icon: XCircle, color: '#f87171', label: 'Dropped' },
  paused: { icon: PauseCircle, color: '#fb923c', label: 'Paused' },
  planned: { icon: Clock, color: '#60a5fa', label: 'Planned' }
}

interface Game {
  id: number
  name: string
  background_image: string
  rating: number
  released: string
  genres?: { name: string }[]
}

interface SearchViewProps {
  libraryData?: Record<number, any>
  onAddGame?: (game: Game, status: string) => void
  onGameClick?: (game: Game, source: 'grid' | 'hero') => void
  onViewCategory?: (id: string, title: string) => void
}

export default function SearchView({
  libraryData = {},
  onAddGame,
  onGameClick,
  onViewCategory
}: SearchViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<Game[]>([])

  const [trending, setTrending] = useState<Game[]>([])
  const [indie, setIndie] = useState<Game[]>([])
  const [isLoadingHome, setIsLoadingHome] = useState(true)

  useEffect(() => {
    const fetchHomeData = async () => {
      setIsLoadingHome(true)
      try {
        const [trendingRes, indieRes] = await Promise.all([
          window.api.getDiscoverGames('trending', 1),
          window.api.getDiscoverGames('indie', 1)
        ])
        if (trendingRes.success) setTrending(trendingRes.data?.results || [])
        if (indieRes.success) setIndie(indieRes.data?.results || [])
      } catch (error) {
        console.error('Failed to load discover data')
      } finally {
        setIsLoadingHome(false)
      }
    }
    fetchHomeData()
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const delayDebounceFn = setTimeout(async () => {
      const res = await window.api.searchGames(searchQuery)
      if (res.success) {
        setSearchResults(res.data?.results || [])
      }
      setIsSearching(false)
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  return (
    <div className="flex flex-col animate-in fade-in duration-300">
      <div className="sticky top-0 z-100 pb-4 pt-1 bg-transparent mx-auto w-[80%] translate-x-[10%]">
        <div className="relative group max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {isSearching ? (
              <Loader2 className="animate-spin text-accent" size={20} />
            ) : (
              <SearchIcon
                className="text-textMuted group-focus-within:text-accent transition-colors"
                size={20}
              />
            )}
          </div>
          <input
            type="text"
            placeholder="Search for games..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-primary border border-modifier/50 text-textMain rounded-2xl py-3 pl-12 pr-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent shadow-lg shadow-black/20 transition-all placeholder:text-textMuted/50"
          />
        </div>
      </div>

      <div className="space-y-8 pb-10 mt-6">
        {searchQuery ? (
          <div className="mt-2">
            <h2 className="text-2xl font-bold text-textMain mb-4">
              Search Results for "{searchQuery}"
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {isSearching
                ? Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)
                : searchResults.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      libraryEntry={libraryData[game.id]}
                      onAddGame={onAddGame}
                      onGameClick={onGameClick}
                    />
                  ))}
            </div>
          </div>
        ) : (
          <>
            {/* Added libraryData and onAddGame so the Carousel can use them */}
            <HeroCarousel
              games={trending}
              isLoading={isLoadingHome}
              searchQuery={searchQuery}
              libraryData={libraryData}
              onAddGame={onAddGame}
              onGameClick={onGameClick}
            />
            <GameRow
              title="Trending Now"
              id="trending"
              games={trending}
              isLoading={isLoadingHome}
              libraryData={libraryData}
              onAddGame={onAddGame}
              onGameClick={onGameClick}
              onViewCategory={onViewCategory}
            />
            <GameRow
              title="Top Indie Gems"
              id="indie"
              games={indie}
              isLoading={isLoadingHome}
              libraryData={libraryData}
              onAddGame={onAddGame}
              onGameClick={onGameClick}
              onViewCategory={onViewCategory}
            />
          </>
        )}
      </div>
    </div>
  )
}

function GameRow({
  id,
  title,
  games,
  isLoading,
  libraryData,
  onAddGame,
  onGameClick,
  onViewCategory
}: any) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const isDown = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    isDown.current = true
    scrollRef.current.classList.add('cursor-grabbing')
    startX.current = e.pageX - scrollRef.current.offsetLeft
    scrollLeft.current = scrollRef.current.scrollLeft
  }
  const handleMouseLeaveOrUp = () => {
    isDown.current = false
    if (scrollRef.current) scrollRef.current.classList.remove('cursor-grabbing')
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDown.current || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX.current) * 1.5
    scrollRef.current.scrollLeft = scrollLeft.current - walk
  }

  return (
    <div>
      <div className="flex justify-between items-end mb-4">
        <h2 className="text-2xl font-bold text-textMain">{title}</h2>
        <button
          className="text-sm font-medium text-textMuted hover:text-accent flex items-center gap-1 transition-colors group cursor-pointer"
          onClick={() => {
            onViewCategory?.(id, title)
          }}
        >
          View All{' '}
          <ChevronRight
            size={16}
            className="transform group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>

      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeaveOrUp}
        onMouseUp={handleMouseLeaveOrUp}
        onMouseMove={handleMouseMove}
        className="flex overflow-x-auto gap-6 pb-8 pt-4 -mt-4 px-2 -mx-2 custom-scrollbar cursor-grab select-none"
      >
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="min-w-[280px]">
                <CardSkeleton />
              </div>
            ))
          : games.map((game: any) => (
              <div key={game.id} className="min-w-[280px] snap-start">
                <GameCard
                  game={game}
                  libraryEntry={libraryData[game.id]}
                  onAddGame={onAddGame}
                  onGameClick={onGameClick}
                />
              </div>
            ))}
      </div>
    </div>
  )
}

// --- PLATFORM MICRO-BADGE DICTIONARY ---
// We use Tailwind colors that pop nicely against your dark 'primary' background
const PLATFORM_MAP: Record<string, { icon: any; color: string }> = {
  pc: {
    icon: FaWindows,
    color: 'group-hover:text-blue-400 group-hover:bg-blue-400/10 group-hover:border-blue-400/30'
  },
  playstation: {
    icon: FaPlaystation,
    color: 'group-hover:text-blue-500 group-hover:bg-blue-500/10 group-hover:border-blue-500/30'
  },
  xbox: {
    icon: FaXbox,
    color: 'group-hover:text-green-500 group-hover:bg-green-500/10 group-hover:border-green-500/30'
  },
  nintendo: {
    icon: BsNintendoSwitch,
    color: 'group-hover:text-red-500 group-hover:bg-red-500/10 group-hover:border-red-500/30'
  },
  mac: {
    icon: FaApple,
    color: 'group-hover:text-gray-200 group-hover:bg-gray-200/10 group-hover:border-gray-200/30'
  },
  linux: {
    icon: FaLinux,
    color:
      'group-hover:text-yellow-400 group-hover:bg-yellow-400/10 group-hover:border-yellow-400/30'
  },
  android: {
    icon: FaAndroid,
    color:
      'group-hover:text-emerald-500 group-hover:bg-emerald-500/10 group-hover:border-emerald-500/30'
  },
  ios: {
    icon: MdPhoneIphone,
    color: 'group-hover:text-gray-200 group-hover:bg-gray-200/10 group-hover:border-gray-200/30'
  }
}

export function GameCard({ game, libraryEntry, onAddGame, onGameClick }: any) {
  const [optimisticStatus, setOptimisticStatus] = useState<string | null>(null)
  const [localLoadingStatus, setLocalLoadingStatus] = useState<string | null>(null)

  const activeStatus = libraryEntry?.status || optimisticStatus
  const actualStatusConfig = activeStatus
    ? STATUS_CONFIG[activeStatus as keyof typeof STATUS_CONFIG]
    : null
  const isAdded = !!activeStatus
  const isNewlyAdded = optimisticStatus !== null

  const showBadge = isAdded && !localLoadingStatus
  const showPill = !isAdded || localLoadingStatus

  const visualColor =
    showBadge && actualStatusConfig ? actualStatusConfig.color : 'rgba(255,255,255,0.05)'
  const visualShadow =
    showBadge && actualStatusConfig
      ? `0 10px 30px -10px ${actualStatusConfig.color}60`
      : '0 10px 15px -3px rgba(0,0,0,0.1)'

  return (
    <motion.div
      onClick={() => onGameClick?.(game, 'grid')}
      animate={{
        borderColor: visualColor,
        boxShadow: visualShadow
      }}
      transition={{ duration: 0.4, delay: isNewlyAdded ? 2.05 : 0 }}
      className="cursor-pointer group flex flex-col bg-primary rounded-2xl overflow-hidden border-2 transition-transform duration-300 hover:-translate-y-1 hover:z-50 relative z-0"
    >
      <AnimatePresence>
        {isNewlyAdded && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-30 scale-x-[-1]"
            style={{ overflow: 'visible' }}
          >
            <motion.rect
              x="1.5"
              y="1.5"
              width="calc(100% - 3px)"
              height="calc(100% - 3px)"
              rx="14.5"
              fill="none"
              stroke={actualStatusConfig?.color}
              strokeWidth="3"
              initial={{ pathLength: 0, pathOffset: 0, opacity: 1 }}
              animate={{ pathLength: 0.5, opacity: 0 }}
              transition={{
                pathLength: { duration: 1.2, ease: 'easeIn', delay: 0.85 },
                opacity: { duration: 0.2, delay: 2.05 }
              }}
            />
            <motion.rect
              x="1.5"
              y="1.5"
              width="calc(100% - 3px)"
              height="calc(100% - 3px)"
              rx="14.5"
              fill="none"
              stroke={actualStatusConfig?.color}
              strokeWidth="3"
              initial={{ pathLength: 0, pathOffset: 1, opacity: 1 }}
              animate={{ pathLength: 0.5, pathOffset: 0.5, opacity: 0 }}
              transition={{
                pathLength: { duration: 1.2, ease: 'easeIn', delay: 0.85 },
                pathOffset: { duration: 1.2, ease: 'easeIn', delay: 0.85 },
                opacity: { duration: 0.2, delay: 2.05 }
              }}
            />
          </svg>
        )}
      </AnimatePresence>

      <div className="relative h-40 overflow-hidden">
        <motion.img
          layoutId={`game-image-${game.id}-grid`} // <-- ADD '-grid' HERE
          src={game.background_image}
          alt={game.name}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500 ease-out"
        />

        <div className="absolute top-2 right-2 flex items-center gap-2 z-30">
          <div className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-xs font-bold text-white flex items-center gap-1 shadow-lg">
            <Star size={12} className="text-accent" /> {game.rating}
          </div>

          {showBadge && actualStatusConfig && (
            <motion.div
              layout
              className="px-2 py-1 bg-black/80 backdrop-blur-md rounded-md text-xs font-bold flex items-center gap-1.5 shadow-lg border border-white/10"
              style={{ color: actualStatusConfig.color }}
            >
              <motion.div
                layoutId={`status-icon-${game.id}-${activeStatus}-grid`} // Suffix added to isolate grid flight
                transition={{ type: 'tween', duration: 0.85, ease: 'easeInOut' }}
              >
                <actualStatusConfig.icon size={14} />
              </motion.div>

              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                transition={{ delay: 0.75 }}
                className="hidden sm:inline overflow-hidden whitespace-nowrap"
              >
                {actualStatusConfig.label}
              </motion.span>
            </motion.div>
          )}
        </div>

        <AnimatePresence>
          {showBadge && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.85 }}
              className="absolute top-2 left-2 px-2 py-1 bg-black/80 backdrop-blur-md rounded-md text-xs font-bold text-white flex items-center gap-1 shadow-lg border border-white/10 z-30"
            >
              <Check size={12} strokeWidth={3} className="text-accent" /> In Library
            </motion.div>
          )}
        </AnimatePresence>

        {showPill && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center z-40 pointer-events-none">
            <InteractiveLibraryPill
              game={game}
              onAddGame={onAddGame}
              localLoadingStatus={localLoadingStatus}
              setLocalLoadingStatus={setLocalLoadingStatus}
              setOptimisticStatus={setOptimisticStatus}
              layoutIdSuffix="-grid" // Suffix passed down
            />
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1 relative z-10 bg-primary">
        <h3 className="font-bold text-textMain line-clamp-1 mb-1">{game.name}</h3>
        <p className="text-xs text-textMuted line-clamp-1">
          {game.genres?.map((g: any) => g.name).join(', ') || 'Various Genres'}
        </p>
        {/* --- PLATFORM ICONS --- */}
        {/* FIX: mt-auto pushes it to the bottom, pt-3 guarantees a gap below the genres! */}
        <div className="flex items-center gap-2 mt-auto pt-3 overflow-hidden">
          {game.parent_platforms?.slice(0, 4).map(({ platform }: any) => {
            const platformData = PLATFORM_MAP[platform.slug]
            if (!platformData) return null

            const Icon = platformData.icon

            return (
              <div
                key={platform.slug}
                title={platform.name}
                className={`flex items-center justify-center w-6 h-6 rounded-md bg-white/5 border border-white/5 text-textMuted/50 transition-all duration-300 ${platformData.color}`}
              >
                <Icon size={12} />
              </div>
            )
          })}

          {/* Overflow Counter */}
          {game.parent_platforms?.length > 4 && (
            <span className="text-[10px] font-bold text-textMuted/40 px-1">
              +{game.parent_platforms.length - 4}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

// --- EXPORTED FOR CAROUSEL ---
export function InteractiveLibraryPill({
  game,
  onAddGame,
  localLoadingStatus,
  setLocalLoadingStatus,
  setOptimisticStatus,
  layoutIdSuffix = ''
}: any) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPreFlight, setIsPreFlight] = useState(false)

  const handleAction = async (e: React.MouseEvent, statusKey: string) => {
    e.stopPropagation()
    if (!onAddGame || localLoadingStatus) return

    setLocalLoadingStatus(statusKey)
    try {
      const minimumDelay = new Promise((resolve) => setTimeout(resolve, 600))
      await Promise.all([Promise.resolve(onAddGame(game, statusKey)), minimumDelay])

      setIsPreFlight(true)
      await new Promise((resolve) => setTimeout(resolve, 350))

      setOptimisticStatus(statusKey)
    } finally {
      setLocalLoadingStatus(null)
    }
  }

  const renderOption = (statusKey: keyof typeof STATUS_CONFIG) => {
    const opt = STATUS_CONFIG[statusKey]
    const isThisLoading = localLoadingStatus === statusKey
    const isOtherLoading = localLoadingStatus !== null && !isThisLoading

    return (
      <motion.button
        key={statusKey}
        disabled={localLoadingStatus !== null}
        onClick={(e) => handleAction(e, statusKey)}
        whileHover={!localLoadingStatus ? { scale: 1.1 } : {}}
        whileTap={!localLoadingStatus ? { scale: 0.9 } : {}}
        animate={{
          opacity: isOtherLoading ? 0.3 : 1,
          filter: isOtherLoading ? 'blur(2px)' : 'blur(0px)'
        }}
        className={`p-1.5 rounded-full transition-colors cursor-pointer ${localLoadingStatus ? 'cursor-default' : 'hover:bg-white/10'} text-white`}
      >
        <motion.div
          layoutId={`status-icon-${game.id}-${statusKey}${layoutIdSuffix}`} // Suffix dynamically appended
          style={{ color: opt.color, zIndex: isThisLoading && isPreFlight ? 100 : 1 }}
          animate={{
            scale: isThisLoading && isPreFlight ? 2.5 : 1,
            y: isThisLoading && isPreFlight ? -80 : 0
          }}
          transition={{
            scale: { type: 'spring', stiffness: 350, damping: 15 },
            y: { type: 'spring', stiffness: 350, damping: 15 }
          }}
        >
          <motion.div
            animate={isThisLoading ? { rotate: 360 } : { rotate: 0 }}
            transition={isThisLoading ? { duration: 1, repeat: Infinity, ease: 'linear' } : {}}
          >
            <opt.icon size={18} />
          </motion.div>
        </motion.div>
      </motion.button>
    )
  }

  return (
    <motion.div
      layout
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !localLoadingStatus && setIsHovered(false)}
      style={{ overflow: isPreFlight ? 'visible' : 'hidden' }}
      className="pointer-events-auto flex items-center bg-black/80 backdrop-blur-xl border border-white/10 rounded-full p-1 shadow-2xl transition-colors relative"
    >
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex overflow-visible"
          >
            {renderOption('dropped')}
            {renderOption('paused')}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        layout="position"
        disabled={localLoadingStatus !== null}
        onClick={(e) => handleAction(e, 'planned')}
        animate={{
          opacity: localLoadingStatus && localLoadingStatus !== 'planned' ? 0.3 : 1,
          filter: localLoadingStatus && localLoadingStatus !== 'planned' ? 'blur(2px)' : 'blur(0px)'
        }}
        className="p-1.5 bg-accent text-white rounded-full cursor-pointer shadow-[0_0_10px_rgba(var(--app-accent),0.5)] z-10 mx-1"
      >
        <motion.div
          layoutId={`status-icon-${game.id}-planned${layoutIdSuffix}`}
          style={{ zIndex: localLoadingStatus === 'planned' && isPreFlight ? 100 : 1 }}
          animate={{
            scale: localLoadingStatus === 'planned' && isPreFlight ? 2.5 : 1,
            y: localLoadingStatus === 'planned' && isPreFlight ? -80 : 0
          }}
          transition={{
            scale: { type: 'spring', stiffness: 350, damping: 15 },
            y: { type: 'spring', stiffness: 350, damping: 15 }
          }}
        >
          <motion.div
            animate={localLoadingStatus === 'planned' ? { rotate: 360 } : { rotate: 0 }}
            transition={
              localLoadingStatus === 'planned'
                ? { duration: 1, repeat: Infinity, ease: 'linear' }
                : {}
            }
          >
            {isHovered ? (
              <STATUS_CONFIG.planned.icon size={18} />
            ) : (
              <Plus size={18} strokeWidth={3} />
            )}
          </motion.div>
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex overflow-visible"
          >
            {renderOption('playing')}
            {renderOption('completed')}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function CardSkeleton() {
  return (
    <div className="flex flex-col bg-primary rounded-2xl overflow-hidden border border-modifier/30 animate-pulse">
      <div className="h-40 bg-modifier/50" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-modifier/50 rounded w-3/4" />
        <div className="h-3 bg-modifier/50 rounded w-1/2" />
      </div>
    </div>
  )
}
