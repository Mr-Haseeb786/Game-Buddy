import { useState, useEffect } from 'react'
import { motion, Variants } from 'framer-motion'
import { ArrowLeft, Loader2, Gamepad2 } from 'lucide-react'
import { GameCard } from './SearchView'

export default function CategoryView({ category, onGameClick, onBack }: any) {
  const [games, setGames] = useState<any[]>([])

  // Pagination States
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingInitial, setIsLoadingInitial] = useState(true)
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false)

  // The Fetch Engine
  useEffect(() => {
    const fetchCategoryGames = async () => {
      if (page === 1) setIsLoadingInitial(true)
      else setIsFetchingNextPage(true)

      try {
        const res = await window.api.getDiscoverGames(category.id, page)

        if (res.success && res.data) {
          const newGames = res.data.results || []

          setGames((prevGames) => {
            // Replace on page 1, append on subsequent pages
            return page === 1 ? newGames : [...prevGames, ...newGames]
          })

          setHasMore(res.data.next !== null)
        }
      } catch (error) {
        console.error('Failed to fetch category:', error)
      } finally {
        setIsLoadingInitial(false)
        setIsFetchingNextPage(false)
      }
    }

    if (category?.id) fetchCategoryGames()
  }, [category, page])

  // Reset state if category changes
  useEffect(() => {
    setGames([])
    setPage(1)
    setHasMore(true)
  }, [category?.id])

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.05 } }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  }

  return (
    <div className="min-h-screen bg-primary pt-24 pb-24 px-8">
      {/* Header Area */}
      <div className="max-w-[1400px] mx-auto mb-10 flex items-center gap-6">
        <button
          onClick={onBack}
          className="p-3 bg-white/5 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-colors border border-white/10 shadow-lg cursor-pointer flex-shrink-0"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="text-accent font-bold tracking-wider uppercase text-sm mb-1 flex items-center gap-2">
            <Gamepad2 size={16} /> Category Collection
          </p>
          <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg">
            {category?.title || 'Games'}
          </h1>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-[1400px] mx-auto">
        {isLoadingInitial ? (
          <div className="w-full py-40 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-accent mb-4" size={48} />
            <p className="text-textMuted font-bold animate-pulse tracking-widest uppercase text-sm">
              Decrypting RAWG Servers...
            </p>
          </div>
        ) : (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
            >
              {games.map((game, index) => (
                <motion.div key={`${game.id}-${index}`} variants={itemVariants}>
                  <GameCard game={game} onGameClick={(g: any) => onGameClick(g, 'grid')} />
                </motion.div>
              ))}
            </motion.div>

            {/* The Load More UI */}
            <div className="mt-16 flex justify-center pb-10">
              {hasMore ? (
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isFetchingNextPage}
                  className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-full backdrop-blur-md border border-white/20 shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-all flex items-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFetchingNextPage ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      Transmitting...
                    </>
                  ) : (
                    'Load More Games'
                  )}
                </button>
              ) : (
                <p className="text-textMuted font-bold tracking-widest uppercase text-sm">
                  End of Database
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
