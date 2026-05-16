import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchGames } from '../api/rawgApi'
import { RawgGame } from '../../../shared/rawg'
import { GameStatus } from '../../../shared/types'
import { Play, Clock, CheckCircle, Pause, XCircle, Check } from 'lucide-react'

interface GameSearchProps {
  onAddGame: (game: RawgGame, status: GameStatus) => void
  existingLibraryIds: number[] // So we can disable the button if already in library
}

export function GameSearch({ onAddGame, existingLibraryIds }: GameSearchProps) {
  const [searchInput, setSearchInput] = useState('')
  const [activeQuery, setActiveQuery] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['games', activeQuery],
    queryFn: () => searchGames(activeQuery),
    enabled: activeQuery.length > 0
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchInput.trim()) setActiveQuery(searchInput.trim())
  }

  // Helper to render the action buttons
  const renderActionButtons = (game: RawgGame, isAdded: boolean) => {
    if (isAdded) {
      return (
        <div className="flex items-center justify-center gap-2 w-full mt-auto py-2 bg-gray-700 text-green-400 rounded cursor-not-allowed">
          <Check size={18} />
          <span className="text-sm font-medium">In Library</span>
        </div>
      )
    }

    return (
      <div className="flex justify-between mt-auto gap-1">
        <button
          onClick={() => onAddGame(game, 'playing')}
          title="Playing"
          className="p-2 bg-gray-700 hover:bg-blue-600 text-white rounded transition-colors flex-1 flex justify-center"
        >
          <Play size={18} />
        </button>
        <button
          onClick={() => onAddGame(game, 'planning')}
          title="Planning to Play"
          className="p-2 bg-gray-700 hover:bg-yellow-600 text-white rounded transition-colors flex-1 flex justify-center"
        >
          <Clock size={18} />
        </button>
        <button
          onClick={() => onAddGame(game, 'completed')}
          title="Completed"
          className="p-2 bg-gray-700 hover:bg-green-600 text-white rounded transition-colors flex-1 flex justify-center"
        >
          <CheckCircle size={18} />
        </button>
        <button
          onClick={() => onAddGame(game, 'paused')}
          title="Paused"
          className="p-2 bg-gray-700 hover:bg-orange-600 text-white rounded transition-colors flex-1 flex justify-center"
        >
          <Pause size={18} />
        </button>
        <button
          onClick={() => onAddGame(game, 'dropped')}
          title="Dropped"
          className="p-2 bg-gray-700 hover:bg-red-600 text-white rounded transition-colors flex-1 flex justify-center"
        >
          <XCircle size={18} />
        </button>
      </div>
    )
  }

  return (
    <div className="mt-8 mb-12">
      <form onSubmit={handleSearch} className="flex gap-2 mb-6">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search RAWG database..."
          className="flex-1 bg-gray-800 text-white border border-gray-700 rounded px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded transition-colors font-medium"
        >
          Search
        </button>
      </form>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {data?.results.map((game) => {
          const isAlreadyAdded = existingLibraryIds.includes(game.id)

          return (
            <div
              key={game.id}
              className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 shadow-lg flex flex-col"
            >
              <div className="h-40 w-full overflow-hidden">
                <img
                  src={game.background_image || 'https://via.placeholder.com/400x200?text=No+Image'}
                  alt={game.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-bold text-white truncate text-lg" title={game.name}>
                  {game.name}
                </h3>
                <div className="flex justify-between mt-2 mb-4 text-sm text-gray-400">
                  <span>⭐ {game.rating}</span>
                  <span>{game.released?.split('-')[0] || 'N/A'}</span>
                </div>

                {/* Render the new button group */}
                {renderActionButtons(game, isAlreadyAdded)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
