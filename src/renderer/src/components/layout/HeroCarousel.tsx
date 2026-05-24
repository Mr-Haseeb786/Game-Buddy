import { useState, useEffect } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { Star, Calendar } from 'lucide-react'

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
  // Incoming image starts off-screen (100% left or right based on direction)
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 1,
    scale: 0.98
  }),
  // Center resting state
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1
  },
  // Outgoing image gets pushed off-screen
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 1,
    scale: 0.98
  })
}

// Utility to ensure our index strictly wraps around the array bounds safely
const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min
}

export default function HeroCarousel({ games, isLoading, searchQuery }: HeroCarouselProps) {
  // 1. We now track BOTH the current page number and the direction of travel
  const [[page, direction], setPage] = useState([0, 0])

  const gamesToDisplay = games.slice(0, 5)

  // Calculate safe array index based on infinite page count
  const heroIndex = gamesToDisplay.length > 0 ? wrap(0, gamesToDisplay.length, page) : 0
  const currentHero = gamesToDisplay[heroIndex]
  const currentColor = ambienceColors[heroIndex % ambienceColors.length]

  // Pagination helper function
  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection])
  }

  // 2. Auto-Rotate Engine
  useEffect(() => {
    if (gamesToDisplay.length <= 1 || searchQuery) return
    const interval = setInterval(() => {
      paginate(1) // Push right automatically
    }, 6000)
    return () => clearInterval(interval)
  }, [gamesToDisplay, searchQuery, page])

  // Broadcast the active ambiance color to the global CSS :root
  useEffect(() => {
    const globalGlow = currentColor.replace('0.4', '0.3')
    document.documentElement.style.setProperty('--app-active-ambiance', globalGlow)

    return () => {
      document.documentElement.style.removeProperty('--app-active-ambiance')
    }
  }, [currentColor])

  // 3. Tactile Swipe Engine
  const swipePower = (offset: number, velocity: number) => Math.abs(offset) * velocity
  const handleDragEnd = (e: any, { offset, velocity }: PanInfo) => {
    const swipe = swipePower(offset.x, velocity.x)
    const swipeConfidenceThreshold = 10000 // How hard they have to flick

    if (swipe < -swipeConfidenceThreshold) {
      paginate(1) // Flicked left -> Go to Next
    } else if (swipe > swipeConfidenceThreshold) {
      paginate(-1) // Flicked right -> Go to Prev
    }
  }

  if (isLoading) return <HeroSkeleton />
  if (!currentHero || searchQuery) return null

  return (
    // 4. Outer Container: Handles the glowing Ambiance shadow
    <motion.div
      // Animate the shadow dynamically based on the current active game
      animate={{
        boxShadow: `0px 20px 120px -20px ${currentColor}`,
        borderColor: currentColor.replace('0.4', '0.2') // Slightly visible border matching glow
      }}
      transition={{ duration: 1.5, ease: 'easeInOut' }}
      className="relative h-[28rem] rounded-[2rem] bg-primary border-2 shadow-2xl transition-all"
    >
      {/* We need overflow hidden on an INNER container so the shadow doesn't get clipped */}
      <div className="absolute inset-0 rounded-[2rem] overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          <motion.div
            key={page}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            // The magic physics transition for that heavy, premium slide
            transition={{
              x: { type: 'spring', stiffness: 300, damping: 30 },
              opacity: { duration: 0.2 },
              scale: { duration: 0.4 }
            }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={1} // Makes the drag feel 1-to-1 with the mouse
            onDragEnd={handleDragEnd}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            {/* Cinematic Image */}
            <img
              src={currentHero.background_image}
              alt={currentHero.name}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
            />

            {/* Gradients */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary/80 to-transparent pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-t from-primary via-transparent to-transparent opacity-80 pointer-events-none" />

            {/* Content Container */}
            <div className="absolute inset-0 p-10 flex flex-col justify-end w-2/3 pointer-events-none select-none">
              <h1 className="text-5xl font-black text-white mb-3 drop-shadow-lg tracking-tight line-clamp-2">
                {currentHero.name}
              </h1>
              <div className="flex items-center gap-4 text-sm font-medium text-textMuted mb-6">
                <span className="flex items-center gap-1.5">
                  <Star size={16} className="text-accent" /> {currentHero.rating}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar size={16} /> {currentHero.released?.split('-')[0] || 'TBA'}
                </span>
              </div>
              <div className="flex gap-3">
                {/* Pointer events auto ensures the button remains clickable even though the container ignores clicks */}
                <button className="pointer-events-auto px-8 py-3 bg-accent hover:bg-accentHover text-white rounded-xl font-bold shadow-lg transition-transform transform hover:-translate-y-0.5 active:scale-95">
                  View Details
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Progress Indicators (Outside the sliding track so they stay still) */}
      <div className="absolute bottom-6 right-10 flex gap-2 z-20 select-none">
        {gamesToDisplay.map((_, i) => (
          <div
            key={i}
            // If they click a dot, we calculate the direction to push!
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
