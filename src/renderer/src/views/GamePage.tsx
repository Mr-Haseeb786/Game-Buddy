import { useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
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
  Plus
} from 'lucide-react'

// Mock Data
const MOCK_GAME = {
  id: 3328,
  name: 'The Witcher 3: Wild Hunt',
  developer: 'CD PROJEKT RED',
  background_image: 'https://media.rawg.io/media/games/618/618c2031a07bbff6b4f611f10b6bcdbc.jpg',
  rating: 4.92,
  released: '2015-05-18',
  description:
    'As war rages on throughout the Northern Realms, you take on the greatest contract of your life — tracking down the Child of Prophecy, a living weapon that can alter the shape of the world. You are Geralt of Rivia, mercenary monster slayer. Before you stands a war-torn, monster-infested continent you can explore at will.',
  genres: ['Action', 'RPG'],
  platforms: ['PC', 'PlayStation 5', 'Xbox Series X'],
  themeColor: '#ea580c' // Orange extracted from art
}

export default function GamePage({ onBack }: { onBack: () => void }) {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false)

  // Parallax Engine for the Hero Image
  const { scrollY } = useScroll()
  const yParallax = useTransform(scrollY, [0, 500], [0, 150])
  const opacityFade = useTransform(scrollY, [0, 300], [1, 0])

  // Dynamic URL construction
  const hltbUrl = `https://howlongtobeat.com/?q=${encodeURIComponent(MOCK_GAME.name)}`
  const pcgbUrl = `https://www.pcgamebenchmark.com/`

  return (
    // FIX 1: Removed overflow-hidden from the root to prevent bottom clipping
    <div className="relative min-h-screen bg-primary selection:bg-accent/30">
      {/* --- 1. THE HARDWARE-ACCELERATED AMBIANCE ENGINE --- */}
      {/* FIX 2: The Sticky Wrapper. This guarantees the gradients follow the camera down the page! */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="sticky top-0 w-full h-screen overflow-hidden">
          {/* Core Theme Glow (Top Left) */}
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              x: ['0%', '5%', '0%'],
              y: ['0%', '10%', '0%'],
              opacity: [0.35, 0.5, 0.35]
            }}
            transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -top-[20%] -left-[10%] w-[120vw] h-[120vw] md:w-[80vw] md:h-[80vw]"
            style={{
              backgroundImage: `radial-gradient(circle, ${MOCK_GAME.themeColor} 0%, transparent 65%)`
            }}
          />

          {/* Deep Contrast Wave (Middle Right) */}
          <motion.div
            animate={{
              scale: [1.2, 1, 1.2],
              x: ['0%', '-8%', '0%'],
              y: ['0%', '-5%', '0%'],
              opacity: [0.25, 0.4, 0.25]
            }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-[20%] -right-[20%] w-[130vw] h-[130vw] md:w-[90vw] md:h-[90vw]"
            style={{ backgroundImage: `radial-gradient(circle, #3b82f6 0%, transparent 60%)` }}
          />

          {/* Ambient Floor Wash (Bottom) - Ensures the Bento Grid has a beautiful backdrop */}
          <motion.div
            animate={{
              y: ['10%', '0%', '10%'],
              opacity: [0.2, 0.35, 0.2]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-[30%] left-[10%] w-[150vw] h-[100vw] md:w-[100vw] md:h-[70vw]"
            style={{
              backgroundImage: `radial-gradient(ellipse at center, ${MOCK_GAME.themeColor} 0%, transparent 70%)`
            }}
          />
        </div>
      </div>

      {/* --- 2. THE TOP NAVIGATION --- */}
      <div className="fixed top-0 left-0 right-0 p-6 z-50 flex justify-between items-center bg-gradient-to-b from-primary/80 to-transparent">
        <button
          onClick={onBack}
          className="p-3 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors border border-white/10 shadow-lg cursor-pointer"
        >
          <ArrowLeft size={20} />
        </button>
      </div>

      {/* --- 3. THE PARALLAX HERO BLEED --- */}
      <div className="relative h-[65vh] w-full z-0">
        <motion.div style={{ y: yParallax, opacity: opacityFade }} className="absolute inset-0">
          <motion.img
            layoutId={`game-image-${MOCK_GAME.id}-grid`}
            src={MOCK_GAME.background_image}
            alt={MOCK_GAME.name}
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* FIX 3: Softened the from-primary mask to primary/90 so the ambient waves bleed through the bottom of the image! */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/80 via-transparent to-transparent" />
      </div>

      {/* --- 4. THE BENTO GRID DASHBOARD --- */}
      <div className="relative z-20 max-w-6xl mx-auto px-8 -mt-40 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-end justify-between"
        >
          <div>
            <p className="text-accent font-bold tracking-wider uppercase text-sm mb-2">
              {MOCK_GAME.developer}
            </p>
            <h1 className="text-5xl md:text-6xl font-black text-white drop-shadow-2xl">
              {MOCK_GAME.name}
            </h1>
          </div>

          <button className="h-14 px-8 bg-accent text-white font-bold rounded-xl flex items-center gap-2 shadow-[0_0_30px_rgba(var(--app-accent),0.4)] hover:-translate-y-1 transition-transform cursor-pointer">
            <Plus size={20} strokeWidth={3} /> Add to Library
          </button>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* LEFT COLUMN */}
          <div className="md:col-span-8 space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl"
            >
              <h2 className="text-xl font-bold text-white mb-4">About</h2>
              <p
                className={`text-textMuted leading-relaxed ${!isDescriptionExpanded && 'line-clamp-3'}`}
              >
                {MOCK_GAME.description}
              </p>
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
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="aspect-video rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 overflow-hidden relative group flex items-center justify-center cursor-pointer shadow-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10" />
              <img
                src={MOCK_GAME.background_image}
                alt="Media"
                className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-700"
              />
              <div className="z-20 w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 group-hover:bg-accent group-hover:border-accent transition-colors">
                <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-white border-b-[10px] border-b-transparent ml-1" />
              </div>
            </motion.div>
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
                  {MOCK_GAME.rating}
                  <span className="text-sm text-textMuted font-normal"> / 5</span>
                </p>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div>
                <p className="text-sm text-textMuted mb-1 flex items-center gap-1.5">
                  <Calendar size={14} /> Released
                </p>
                <p className="text-lg font-bold text-white">{MOCK_GAME.released}</p>
              </div>
            </motion.div>

            {/* THE INTEGRATION HUB */}
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
                {MOCK_GAME.platforms.map((p) => (
                  <span
                    key={p}
                    className="px-3 py-1 rounded-lg bg-black/40 border border-white/10 text-xs font-medium text-textMuted"
                  >
                    {p}
                  </span>
                ))}
              </div>

              <h2 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Genres</h2>
              <div className="flex flex-wrap gap-2">
                {MOCK_GAME.genres.map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 rounded-lg bg-accent/20 border border-accent/30 text-xs font-medium text-accent"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
