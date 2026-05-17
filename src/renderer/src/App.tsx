// src/renderer/src/App.tsx
import { useState, useEffect } from 'react'
import { FileNode } from '../../shared/types'
import { LibraryData, GameEntry } from '../../shared/types'
import { GameSearch } from './components/GameSearch'
import { RawgGame } from 'src/shared/rawg'
import { GameStatus } from '../../shared/types'
import { ManageGameModal } from './components/ManageGameModal'
import { Cloud, CloudOff, CloudDrizzle, AlertTriangle } from 'lucide-react'
import { SyncStatus } from '../../shared/types'

export default function App() {
  const [files, setFiles] = useState<FileNode[]>([])
  const [error, setError] = useState<string | null>(null)

  const [library, setLibrary] = useState<LibraryData | null>(null)
  const [syncState, setSyncState] = useState<SyncStatus>('idle')

  // Track which game is currently open in the modal
  const [managingGame, setManagingGame] = useState<GameEntry | null>(null)

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(true)

  // Load the library when the app opens
  useEffect(() => {
    window.api.loadLibrary().then(setLibrary).catch(console.error)
    const checkAuth = async () => {
      const isLinked = await window.api.checkGoogleAuth()
      setIsAuthenticated(isLinked)
      setIsAuthenticating(false) // Done checking
    }
    checkAuth()

    // Setup the listener once when the app mounts
    window.api.onSyncStatusUpdate((status) => {
      setSyncState(status)

      // If it's a success, clear the success message after 3 seconds to go back to idle
      if (status === 'success') {
        setTimeout(() => setSyncState('idle'), 3000)
      }
    })

    const checkAuthAndHydrate = async () => {
      const isLinked = await window.api.checkGoogleAuth()
      setIsAuthenticated(isLinked)

      if (isLinked) {
        // HYDRATION: If they are linked, immediately pull from cloud to ensure local is up to date
        try {
          const cloudLibrary = await window.api.restoreFromCloud()
          if (cloudLibrary) {
            setLibrary(cloudLibrary) // Update UI with cloud data
          }
        } catch (e) {
          console.error('Failed to pull latest cloud save on boot')
        }
      }
      setIsAuthenticating(false)
    }

    checkAuthAndHydrate()
  }, [])

  const renderCloudUI = () => {
    if (!isAuthenticated) {
      return {
        icon: <CloudOff className="text-gray-500" size={24} />,
        text: 'Not connected',
        color: 'text-gray-500'
      }
    }

    switch (syncState) {
      case 'syncing':
        return {
          icon: <CloudDrizzle className="text-blue-400 animate-pulse" size={24} />,
          text: 'Syncing to Drive...',
          color: 'text-blue-400'
        }
      case 'error':
        return {
          icon: <AlertTriangle className="text-red-500 animate-bounce" size={24} />,
          text: 'Sync failed. Will retry next save.',
          color: 'text-red-500'
        }
      case 'success':
        return {
          icon: <Cloud className="text-green-400" size={24} />,
          text: 'Library synced successfully',
          color: 'text-green-400'
        }
      default:
        return {
          icon: <Cloud className="text-gray-400" size={24} />,
          text: 'Up to date',
          color: 'text-gray-400'
        }
    }
  }

  const cloudUI = renderCloudUI()

  const handleGoogleLogin = async () => {
    try {
      setIsAuthenticating(true)
      const success = await window.api.loginToGoogleDrive()

      if (success) {
        setIsAuthenticated(true)

        // HYDRATION: The moment they log in, pull their historical data!
        setSyncState('syncing') // Borrow our UI state to show it's working
        const cloudLibrary = await window.api.restoreFromCloud()

        if (cloudLibrary) {
          setLibrary(cloudLibrary)
          setSyncState('success')
        } else {
          setSyncState('idle') // No cloud data existed yet
        }
      }
    } catch (error: any) {
      const errorMessage = String(error?.message || error)
      if (!errorMessage.includes('USER_CANCELLED')) {
        // ... alert logic ...
      }
    } finally {
      setIsAuthenticating(false)
    }
  }

  // The new Cancel handler
  const handleCancelAuth = async () => {
    await window.api.cancelGoogleLogin()
  }

  const handleGoogleLogout = async () => {
    const success = await window.api.logoutGoogleDrive()
    if (success) {
      setIsAuthenticated(false)
    }
  }

  const handleForceSync = async () => {
    // The backend will automatically emit 'syncing', 'success', or 'error' events,
    // so our existing useEffect listener will handle the UI state changes!
    await window.api.forceSync()
  }

  // The core transformation and save function
  const handleAddGameFromSearch = async (rawgGame: RawgGame, selectedStatus: GameStatus) => {
    if (!library) return

    const newGame: GameEntry = {
      rawgId: rawgGame.id,
      title: rawgGame.name,
      status: selectedStatus, // Dynamically assign the chosen status
      timePlayedMinutes: 0,
      savePathDesktop: null,
      updatedAt: Date.now()
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
        {/* Cloud Sync Header Bar */}
        <div className="flex justify-between items-center bg-gray-800 p-4 rounded-lg border border-gray-700 mb-8 shadow-md">
          <div className="flex items-center gap-3">
            {cloudUI.icon}
            <div>
              <h2 className="font-bold text-white">Google Drive Sync</h2>
              <p className={`text-xs font-medium transition-colors ${cloudUI.color}`}>
                {cloudUI.text}
              </p>
            </div>
            {isAuthenticated ? (
              <Cloud className="text-green-400" size={24} />
            ) : (
              <CloudOff className="text-gray-500" size={24} />
            )}
            <div>
              <h2 className="font-bold text-white">Google Drive Sync</h2>
              <p className="text-xs text-gray-400">
                {isAuthenticating
                  ? 'Checking connection...'
                  : isAuthenticated
                    ? 'Connected to AppData folder'
                    : 'Not connected'}
              </p>
            </div>
          </div>

          <div>
            {isAuthenticated ? (
              <div className="flex gap-2">
                {/* NEW: Render the Retry button only if there is an error */}
                {syncState === 'error' && (
                  <button
                    onClick={handleForceSync}
                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-medium text-sm transition-colors shadow-lg flex items-center gap-2"
                  >
                    Retry Sync
                  </button>
                )}
                <button
                  onClick={handleGoogleLogout}
                  className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded font-medium text-sm transition-colors border border-red-900/50"
                >
                  Unlink Account
                </button>
              </div>
            ) : isAuthenticating ? (
              <div className="flex gap-2">
                <span className="px-4 py-2 bg-gray-700 text-gray-400 rounded font-medium text-sm border border-gray-600 flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full"></span>
                  Waiting...
                </span>
                <button
                  onClick={handleCancelAuth}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-medium text-sm transition-colors shadow-lg"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-sm transition-colors shadow-lg"
              >
                Link Google Account
              </button>
            )}
          </div>
        </div>

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
