// src/renderer/src/App.tsx
import { useState, useEffect } from 'react'
import { FileNode } from '../../shared/types'
import { LibraryData, GameEntry } from '../../shared/types'
import { GameSearch } from './components/GameSearch'
import { RawgGame } from 'src/shared/rawg'
import { GameStatus } from '../../shared/types'
import { ManageGameModal } from './components/ManageGameModal'

export default function App() {
  const [files, setFiles] = useState<FileNode[]>([])
  const [error, setError] = useState<string | null>(null)
  const [library, setLibrary] = useState<LibraryData | null>(null)
  // Track which game is currently open in the modal
  const [managingGame, setManagingGame] = useState<GameEntry | null>(null)

  // Load the library when the app opens
  useEffect(() => {
    window.api.loadLibrary().then(setLibrary).catch(console.error)
  }, [])

  // The core transformation and save function
  const handleAddGameFromSearch = async (rawgGame: RawgGame, selectedStatus: GameStatus) => {
    if (!library) return

    const newGame: GameEntry = {
      rawgId: rawgGame.id,
      title: rawgGame.name,
      status: selectedStatus, // Dynamically assign the chosen status
      timePlayedMinutes: 0,
      savePathDesktop: null
    }

    const updatedLibrary: LibraryData = {
      ...library,
      games: {
        ...library.games,
        [newGame.rawgId]: newGame
      }
    }

    const success = await window.api.saveLibrary(updatedLibrary)
    if (success) {
      setLibrary(updatedLibrary)
    }
  }

  // Update an existing game
  const handleUpdateGame = async (updatedGame: GameEntry) => {
    if (!library) return

    const updatedLibrary: LibraryData = {
      ...library,
      games: {
        ...library.games,
        [updatedGame.rawgId]: updatedGame
      }
    }

    const success = await window.api.saveLibrary(updatedLibrary)
    if (success) {
      setLibrary(updatedLibrary)
      setManagingGame(null) // Close the modal on success
    }
  }

  // Remove a game
  const handleRemoveGame = async (rawgId: number) => {
    if (!library) return

    const updatedGames = { ...library.games }
    delete updatedGames[rawgId] // Remove the key

    const updatedLibrary: LibraryData = {
      ...library,
      games: updatedGames
    }

    const success = await window.api.saveLibrary(updatedLibrary)
    if (success) {
      setLibrary(updatedLibrary)
      setManagingGame(null) // Close the modal on success
    }
  }

  if (!library) return <div className="p-8 text-white">Loading library...</div>

  const existingIds = Object.values(library.games).map((g) => g.rawgId)

  // const handleScan = async () => {
  //   try {
  //     setError(null)
  //     // Hardcode a safe path to test, like your Documents or C drive root
  //     const testPath = 'C:\\'
  //     const result = await window.api.scanDirectory(testPath)
  //     setFiles(result)
  //   } catch (err: any) {
  //     setError(err.message)
  //   }
  // }

  return (
    <div className="p-8 min-h-screen bg-gray-900 text-gray-100 font-sans">
      {managingGame && (
        <ManageGameModal
          game={managingGame}
          onClose={() => setManagingGame(null)}
          onUpdate={handleUpdateGame}
          onRemove={handleRemoveGame}
        />
      )}

      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Find Games</h1>
        {/* Mount the search component and pass down the props */}
        <GameSearch onAddGame={handleAddGameFromSearch} existingLibraryIds={existingIds} />

        <hr className="border-gray-700 my-8" />

        <div className="flex justify-between items-end mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">My Library</h2>
            <p className="text-gray-400 text-sm mt-1">
              {Object.keys(library.games).length} games tracked
            </p>
          </div>
        </div>

        {/* The Library Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(library.games).map((game) => (
            <div
              key={game.rawgId}
              className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex justify-between items-center"
            >
              <div>
                <h3 className="text-lg font-bold text-white">{game.title}</h3>
                <div className="mt-2 flex gap-2">
                  <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded capitalize">
                    {game.status}
                  </span>
                </div>
              </div>
              <button
                className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded transition-colors"
                onClick={() => setManagingGame(game)}
              >
                Manage
              </button>
            </div>
          ))}
          {Object.keys(library.games).length === 0 && (
            <p className="text-gray-500 italic col-span-full">
              Your library is empty. Search for a game above to get started.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
