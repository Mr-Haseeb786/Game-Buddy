import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  LayoutGrid,
  List as ListIcon,
  FolderPlus,
  CloudAlert,
  ArrowDownWideNarrow
} from 'lucide-react'
import { useDebounce } from '@renderer/utils'
// import { STATUS_CONFIG } from './SearchView'
import LibraryGridCard from '../components/LibraryGridCard'
import LibraryListRow from '@renderer/components/layout/LibraryListRow'
// import LibraryTableRow from '../components/LibraryTableRow'

export default function LibraryView({
  libraryData = {},
  onUpdateGame,
  onBackupTrigger,
  onRemoveGame
}: any) {
  // --- 1. STATE MACHINE ---
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearch = useDebounce(searchQuery, 300)

  const [showFilters, setShowFilters] = useState(false)
  const [activeStatuses, setActiveStatuses] = useState<string[]>([])
  const [specialFilters, setSpecialFilters] = useState({ needsPath: false, needsBackup: false })
  const [sortMode, setSortMode] = useState<'recent_added' | 'recent_played' | 'alphabetical'>(
    'recent_added'
  )

  // --- 2. THE DATA PIPELINE (Highly Optimized) ---
  const processedGames = useMemo(() => {
    let result = Object.values(libraryData) as any[]

    // A. Text Search
    if (debouncedSearch) {
      const lowerQuery = debouncedSearch.toLowerCase()
      result = result.filter((g) => g.title.toLowerCase().includes(lowerQuery))
    }

    // B. Status Filters (OR logic: if playing OR completed)
    if (activeStatuses.length > 0) {
      result = result.filter((g) => activeStatuses.includes(g.status))
    }

    // C. Special Utility Filters (AND logic)
    if (specialFilters.needsPath) {
      result = result.filter((g) => !g.savePathDesktop)
    }
    if (specialFilters.needsBackup) {
      // Assuming games without a cloudSaveId need a backup
      result = result.filter((g) => !g.cloudSaveId && g.status === 'playing')
    }

    // D. Sorting Engine
    result.sort((a, b) => {
      switch (sortMode) {
        case 'alphabetical':
          return a.title.localeCompare(b.title)
        case 'recent_played':
          return (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0)
        case 'recent_added':
        default:
          return (b.updatedAt || 0) - (a.updatedAt || 0) // Fallback to when it was added/modified
      }
    })

    return result
  }, [libraryData, debouncedSearch, activeStatuses, specialFilters, sortMode])

  // --- 3. UI RENDERING ---
  return (
    <div className="min-h-screen bg-primary pt-24 pb-20 px-8 flex flex-col">
      <div className="max-w-[1600px] w-full mx-auto flex-1 flex flex-col">
        {/* HEADER: The Command Center */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black text-white drop-shadow-lg mb-2">My Library</h1>
            <p className="text-textMuted font-medium flex items-center gap-2">
              <span className="text-accent font-bold">{processedGames.length}</span> Games Tracked
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search Bar */}
            <div className="relative group w-full md:w-64">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted group-focus-within:text-accent transition-colors"
                size={18}
              />
              <input
                type="text"
                placeholder="Search library..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 text-white rounded-xl py-2.5 pl-10 pr-4 focus:outline-none focus:border-accent/50 focus:bg-white/10 transition-all placeholder:text-textMuted/50"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 cursor-pointer rounded-xl border transition-colors flex items-center gap-2 ${showFilters || activeStatuses.length > 0 || specialFilters.needsBackup || specialFilters.needsPath ? 'bg-accent/20 border-accent/50 text-accent' : 'bg-white/5 border-white/10 text-textMuted hover:bg-white/10 hover:text-white'}`}
            >
              <Filter size={18} />
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 cursor-pointer rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-textMuted hover:text-white'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 cursor-pointer rounded-lg transition-all ${viewMode === 'table' ? 'bg-white/10 text-white shadow-sm' : 'text-textMuted hover:text-white'}`}
              >
                <ListIcon size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* EXPANDABLE FILTER PANEL */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginBottom: 0 }}
              animate={{ height: 'auto', opacity: 1, marginBottom: 32 }}
              exit={{ height: 0, opacity: 0, marginBottom: 0 }}
              className="overflow-hidden"
            >
              <div className="p-5 bg-white/5 border border-white/10 rounded-2xl flex flex-wrap gap-6">
                {/* Special Utility Filters */}
                <div className="flex flex-col gap-3 border-r border-white/10 pr-6">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
                    Action Required
                  </span>
                  <button
                    onClick={() => setSpecialFilters((s) => ({ ...s, needsPath: !s.needsPath }))}
                    className={`flex cursor-pointer items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-all border ${specialFilters.needsPath ? 'bg-red-500/20 text-red-400 border-red-500/50' : 'bg-transparent text-textMuted border-transparent hover:bg-white/5'}`}
                  >
                    <FolderPlus size={16} /> Missing Save Path
                  </button>
                  <button
                    onClick={() =>
                      setSpecialFilters((s) => ({ ...s, needsBackup: !s.needsBackup }))
                    }
                    className={`flex cursor-pointer items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-all border ${specialFilters.needsBackup ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-transparent text-textMuted border-transparent hover:bg-white/5'}`}
                  >
                    <CloudAlert size={16} /> Needs Backup
                  </button>
                </div>

                {/* Status Filters (You can map these from STATUS_CONFIG) */}
                <div className="flex flex-col gap-3">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
                    Game Status
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {/* Example manually placed, but map them in production */}
                    {['playing', 'completed', 'paused', 'planned', 'dropped'].map((status) => (
                      <button
                        key={status}
                        onClick={() =>
                          setActiveStatuses((prev) =>
                            prev.includes(status)
                              ? prev.filter((s) => s !== status)
                              : [...prev, status]
                          )
                        }
                        className={`capitalize cursor-pointer text-sm font-medium px-3 py-1.5 rounded-lg transition-all border ${activeStatuses.includes(status) ? 'bg-white/20 text-white border-white/30' : 'bg-white/5 text-textMuted border-white/10 hover:bg-white/10'}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sort Dropdown */}
                <div className="flex flex-col gap-3 ml-auto">
                  <span className="text-xs font-bold text-textMuted uppercase tracking-wider">
                    Sort By
                  </span>
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as any)}
                    className="bg-black/50 border cursor-pointer border-white/10 text-white text-sm rounded-lg px-3 py-2 outline-none focus:border-accent"
                  >
                    <option value="recent_added">Recently Added</option>
                    <option value="recent_played">Recently Played</option>
                    <option value="alphabetical">Alphabetical (A-Z)</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* THE MAIN CONTENT RENDERER */}
        <div className="flex-1 relative">
          <AnimatePresence mode="wait">
            {processedGames.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-textMuted"
              >
                <Search size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-bold">No games found.</p>
                <p className="text-sm">Try adjusting your filters or search query.</p>
              </motion.div>
            ) : viewMode === 'grid' ? (
              <motion.div
                key="grid-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6"
              >
                {/* layout prop enables the Liquid Grid animation when items are filtered */}
                {processedGames.map((game) => (
                  <motion.div layout key={game.rawgId}>
                    <LibraryGridCard
                      game={game}
                      onUpdate={onUpdateGame}
                      onBackup={onBackupTrigger}
                      onRemoveGame={onRemoveGame}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="table-view"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col gap-2"
              >
                {processedGames.map((game) => (
                  <motion.div layout key={game.rawgId}>
                    <LibraryListRow
                      game={game}
                      onUpdate={onUpdateGame}
                      onBackup={onBackupTrigger}
                      onRemoveGame={onRemoveGame}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
