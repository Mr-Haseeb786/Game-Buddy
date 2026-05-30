// src/renderer/src/App.tsx
import { useState, useEffect } from 'react'
import { AppSettings, FileNode, NetworkTask, SystemNotification } from '../../shared/types'
import { LibraryData, GameEntry } from '../../shared/types'
import { GameSearch } from './components/GameSearch'
import { RawgGame } from 'src/shared/rawg'
import { GameStatus } from '../../shared/types'
import { ManageGameModal } from './components/ManageGameModal'
import { Cloud, CloudOff, CloudDrizzle, AlertTriangle } from 'lucide-react'
import { SyncStatus } from '../../shared/types'
import BackupModal from './components/BackUpModal'
import CloudManagerModal from './components/CloudManagerModal'

// UI
import { useUI } from './context/UIContext'

// Views
import LibraryView from './views/LibraryView'
import SearchView from './views/SearchView'
import ProfileView from './views/ProfileView'
import SettingsView from './views/SettingsView'
import MainLayout from './components/layout/MainLayout'
import GamePage from './views/GamePage'
import CategoryView from './views/CategoryView'

export default function App() {
  const { currentPage, setCurrentPage } = useUI()
  const [selectedGame, setSelectedGame] = useState<any | null>(null)
  const [clickSource, setClickSource] = useState<'grid' | 'hero'>('grid')

  const [library, setLibrary] = useState<LibraryData | null>(null)
  const [syncState, setSyncState] = useState<SyncStatus>('idle')

  // Track which game is currently open in the modal
  const [managingGame, setManagingGame] = useState<GameEntry | null>(null)

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(true)

  const [backingUpGame, setBackingUpGame] = useState<GameEntry | null>(null)
  const [showCloudManager, setShowCloudManager] = useState(false)

  const [activeCategory, setActiveCategory] = useState<{ id: string; title: string } | null>(null)

  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [networkTasks, setNetworkTasks] = useState<NetworkTask[]>([])
  const [notifications, setNotifications] = useState<SystemNotification[]>([])

  // Load the library when the app opens
  useEffect(() => {
    Promise.all([
      window.api.loadLibrary().then(setLibrary),
      window.api.loadSettings().then(setSettings)
    ]).catch(console.error)

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

  // Helper to push a new notification globally
  const pushNotification = (
    title: string,
    message: string,
    type: SystemNotification['type'] = 'info'
  ) => {
    setNotifications((prev) =>
      [
        {
          id: `notif-${Date.now()}-${Math.random()}`,
          title,
          message,
          type,
          timestamp: Date.now(),
          read: false
        },
        ...prev
      ].slice(0, 50)
    ) // Keep the last 50 alerts in memory
  }

  // Helper to mark all as read
  const handleMarkNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  // The Switcher Function
  const renderActiveView = () => {
    switch (currentPage) {
      case 'library':
        return (
          <LibraryView
            libraryData={library?.games || {}}
            onUpdateGame={handleUpdateGame}
            onBackupTrigger={(game: any) => setBackingUpGame(game)}
            onRemoveGame={handleRemoveGame}
          />
        )
      case 'search':
        return (
          <SearchView
            libraryData={library?.games || {}}
            onAddGame={handleAddGameFromSearch as any}
            // PASS BOTH THE GAME AND THE SOURCE
            onGameClick={(game, source) => {
              setSelectedGame(game)
              setClickSource(source)
              setCurrentPage('game')
            }}
            onViewCategory={(id, title) => {
              setActiveCategory({ id, title })
              setCurrentPage('category')
            }}
          />
        )
      case 'category':
        return (
          <CategoryView
            category={activeCategory}
            onGameClick={(game, source) => {
              setSelectedGame(game)
              setClickSource(source)
              setCurrentPage('game')
            }}
            onBack={() => {
              setActiveCategory(null)
              setCurrentPage('search') // Or 'library', depending on where your rows live
            }}
          />
        )
      case 'profile':
        return (
          <ProfileView
            library={library}
            settings={settings}
            onUpdateProfile={handleUpdateSettings}
            isAuthenticated={isAuthenticated}
            isAuthenticating={isAuthenticating}
            syncState={syncState}
            onGoogleLogin={handleGoogleLogin}
            onGoogleLogout={handleGoogleLogout}
            onManageStorage={() => setShowCloudManager(true)}
            onCancelAuth={handleCancelAuth}
          />
        )
      case 'settings':
        return <SettingsView />
      case 'game':
        return (
          <GamePage
            // PASS THEM TO THE GAME PAGE
            initialGame={selectedGame}
            source={clickSource}
            libraryEntry={library?.games[selectedGame?.id]}
            onAddGame={handleAddGameFromSearch as any}
            onBack={() => {
              setSelectedGame(null)
              setCurrentPage('search')
            }}
          />
        )
      default:
        return <LibraryView />
    }
  }

  const handleTestBackup = () => {
    // 1. Check if the library is loaded
    if (!library) {
      alert('Library is still loading...')
      return
    }

    // 2. Grab the first actual game in your library
    const firstRealGame = Object.values(library.games)[0]

    if (!firstRealGame) {
      alert('Please search for and add at least one real game to your library first!')
      return
    }

    // 3. Trigger the modal with the real game
    setBackingUpGame(firstRealGame)
  }

  // Temporary Test Function for the Download Engine
  const handleTestRestore = async () => {
    if (!library) {
      alert("Library data hasn't loaded yet!")
      return
    }

    // Find the first game in your library that has successfully backed up to the cloud
    const gameToRestore = Object.values(library.games).find((g) => g.cloudSaveId)

    if (!gameToRestore || !gameToRestore.cloudSaveId) {
      alert('No cloud saves found in library.json! Run the Backup test first.')
      return
    }

    console.log(`Attempting to restore: ${gameToRestore.title}`)

    // Trigger the native IPC bridge
    const success = await window.api.restoreGameSave(
      gameToRestore.rawgId,
      gameToRestore.title,
      gameToRestore.cloudSaveId
    )

    if (success) {
      console.log('Restore complete!')
    }
  }

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
        pushNotification(
          'Secure Uplink Established',
          'Successfully authenticated with Google Drive. Telemetry is active.',
          'success'
        )
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

  const handleOnSync = async (checkedFiles) => {
    if (!backingUpGame) {
      return alert('Backing Up game is null')
    }

    try {
      console.log(`Starting zip and upload for ${checkedFiles.length} files...`)

      // 1. Start listening to the live progress stream from Node.js
      const cleanupListener = window.api.onSaveProgress(backingUpGame.rawgId, (percent) => {
        console.log(`Upload Progress: ${percent}%`)
        // (Later, we can tie this to a real progress bar UI!)
      })

      // 2. Trigger the actual Zipping & Uploading Engine
      const success = await window.api.syncGameSave(backingUpGame.rawgId, checkedFiles)

      // 3. Clean up and close
      cleanupListener()
      if (success) {
        alert('Backup successfully zipped and uploaded to Google Drive!')
      }
      setBackingUpGame(null)
    } catch (error) {
      console.error('Backup failed:', error)
      alert('Failed to upload backup. Check the console for details.')
    }
  }

  const handlePullFromCloud = async () => {
    setIsAuthenticating(true) // Reuse this state to show a loading spinner
    try {
      const freshLibrary = await window.api.restoreFromCloud()
      if (freshLibrary) {
        setLibrary(freshLibrary)
        setSyncState('success')
      }
    } catch (error) {
      console.error('Failed to pull from cloud:', error)
      alert('Failed to sync with Google Drive.')
    } finally {
      setIsAuthenticating(false)
    }
  }

  // The core transformation and save function
  const handleAddGameFromSearch = async (rawgGame: RawgGame, selectedStatus: GameStatus) => {
    // 1. Generate the exact filename the Backup Engine would have used
    const expectedFileName = `${rawgGame.name.replace(/[^a-z0-9]/gi, '_')}_save.zip`

    // 2. Check the cloud for this exact file (Orphan Recovery)
    let recoveredCloudId: string | null = null

    try {
      // Only attempt recovery if the user is actually linked to Google Drive
      if (isAuthenticated) {
        const cloudFiles = await window.api.getCloudStorageStats()
        const orphanMatch = cloudFiles.find((file) => file.name === expectedFileName)

        if (orphanMatch) {
          recoveredCloudId = orphanMatch.id
          console.log(`Orphan save automatically recovered for ${rawgGame.name}!`)
        }
      }
    } catch (error) {
      console.error('Failed to check for orphaned cloud saves:', error)
      // We don't want to block the user from adding the game if the network drops,
      // so we just catch the error and let recoveredCloudId remain null.
    }

    // 3. Bulletproof Add Game logic using functional state update
    setLibrary((prev) => {
      if (!prev) return prev

      const newGame: GameEntry = {
        rawgId: rawgGame.id,
        title: rawgGame.name,
        status: selectedStatus,
        timePlayedMinutes: 0,
        savePathDesktop: null,
        updatedAt: Date.now(),
        saveExtension: null,
        cloudSaveId: recoveredCloudId,
        background_image: rawgGame.background_image
      }

      const updatedLibrary: LibraryData = {
        ...prev,
        games: { ...prev.games, [newGame.rawgId]: newGame }
      }

      // Fire and forget save
      window.api.saveLibrary(updatedLibrary).catch(console.error)
      return updatedLibrary
    })
  }

  const handleUpdateSettings = (profileData: { name?: string; avatar?: string }) => {
    setSettings((prev) => {
      const current = prev || { userProfile: { name: 'Player One', avatar: '' } }
      const updatedSettings = {
        ...current,
        userProfile: { ...current.userProfile, ...profileData }
      }
      // Fire and forget to the hard drive
      window.api.saveSettings(updatedSettings).catch(console.error)
      return updatedSettings
    })
  }

  // Update an existing game
  const handleUpdateGame = async (updatedGame: GameEntry) => {
    setLibrary((prev) => {
      if (!prev) return prev

      const updatedLibrary: LibraryData = {
        ...prev,
        games: { ...prev.games, [updatedGame.rawgId]: updatedGame }
      }

      window.api.saveLibrary(updatedLibrary).catch(console.error)
      setManagingGame(null) // Close the modal
      return updatedLibrary
    })
  }

  // Remove a game
  const handleRemoveGame = async (rawgId: number, deleteFromCloud: boolean) => {
    // 1. Grab the latest target game safely
    const gameToRemove = library?.games[rawgId]

    // 2. If requested, permanently delete the save from Google Drive first
    if (deleteFromCloud && gameToRemove?.cloudSaveId) {
      try {
        await window.api.deleteCloudSave(gameToRemove.cloudSaveId)
        console.log(`Successfully deleted cloud save for ${gameToRemove.title}`)
      } catch (error) {
        console.error('Failed to delete cloud save:', error)
        alert('Failed to delete the save from Google Drive. Aborting removal to protect data.')
        return // Safety Abort: Don't remove it locally if the cloud deletion failed
      }
    }

    // 3. Bulletproof local removal using functional state update
    setLibrary((prev) => {
      if (!prev) return prev

      const updatedGames = { ...prev.games }
      delete updatedGames[rawgId]

      const updatedLibrary: LibraryData = {
        ...prev,
        games: updatedGames
      }

      window.api.saveLibrary(updatedLibrary).catch(console.error)
      setManagingGame(null) // Close the modal
      return updatedLibrary
    })
  }

  const handleCloudSaveDeleted = (deletedFileId: string) => {
    // By passing a function into setLibrary, we bypass any stale closures
    // and guarantee we are working with React's absolute latest state.
    setLibrary((prevLibrary) => {
      if (!prevLibrary) return prevLibrary

      let hasChanges = false
      const updatedGames = { ...prevLibrary.games }

      // Search for any game linked to this deleted file and unlink it
      Object.values(updatedGames).forEach((game) => {
        if (game.cloudSaveId === deletedFileId) {
          updatedGames[game.rawgId] = { ...game, cloudSaveId: null }
          hasChanges = true
        }
      })

      if (hasChanges) {
        const updatedLibrary: LibraryData = {
          ...prevLibrary,
          games: updatedGames
        }

        // Fire and forget: Tell the backend to save this new truth to the hard drive
        window.api.saveLibrary(updatedLibrary).catch(console.error)

        // The magic happens here: Returning this forces React to instantly
        // re-render the Library Grid and Modals with the fresh data!
        return updatedLibrary
      }

      return prevLibrary
    })
  }

  if (!library) return <div className="p-8 text-white">Loading library...</div>

  const existingIds = Object.values(library.games).map((g) => g.rawgId)

  return (
    <MainLayout
      settings={settings}
      syncState={syncState}
      isAuthenticated={isAuthenticated}
      networkTasks={networkTasks}
      notifications={notifications}
      onMarkNotificationsRead={handleMarkNotificationsRead}
    >
      {renderActiveView()}
      <div className="p-8 min-h-screen bg-gray-900 text-gray-100 font-sans">
        {managingGame && (
          <ManageGameModal
            game={managingGame}
            onClose={() => setManagingGame(null)}
            onUpdate={handleUpdateGame}
            onRemove={handleRemoveGame}
          />
        )}

        {showCloudManager && (
          <CloudManagerModal
            onClose={() => setShowCloudManager(false)}
            onFileDeleted={handleCloudSaveDeleted}
          />
        )}

        {/* NEW: Render the Backup Modal */}
        {backingUpGame && (
          <BackupModal
            game={backingUpGame}
            onClose={() => setBackingUpGame(null)}
            onSync={async (checkedFiles) => {
              try {
                // 1. Create a unique ID for this task
                const taskId = `upload-${backingUpGame.rawgId}-${Date.now()}`

                // 2. Add the task to the UI immediately
                setNetworkTasks((prev) => [
                  {
                    id: taskId,
                    title: backingUpGame.title,
                    type: 'upload',
                    progress: 0,
                    status: 'active'
                  },
                  ...prev
                ])

                // 3. Start listening to the live progress stream
                const cleanupListener = window.api.onSaveProgress(
                  backingUpGame.rawgId,
                  (percent) => {
                    // Instantly update the progress bar in the Action Center
                    setNetworkTasks((prev) =>
                      prev.map((task) =>
                        task.id === taskId ? { ...task, progress: percent } : task
                      )
                    )
                  }
                )

                // 4. Trigger the Zipping & Uploading Engine
                const success = await window.api.syncGameSave(backingUpGame.rawgId, checkedFiles)

                cleanupListener()

                if (success) {
                  // 5. Mark as complete, wait 3 seconds, then remove from drawer
                  setNetworkTasks((prev) =>
                    prev.map((task) =>
                      task.id === taskId ? { ...task, progress: 100, status: 'completed' } : task
                    )
                  )
                  setTimeout(() => {
                    setNetworkTasks((prev) => prev.filter((t) => t.id !== taskId))
                  }, 3000)

                  const freshLibrary = await window.api.loadLibrary()
                  setLibrary(freshLibrary)
                }
                setBackingUpGame(null)
              } catch (error) {
                console.error('Backup failed:', error)
                // Mark as error so the user sees the red failure state
                setNetworkTasks((prev) =>
                  prev.map((task) =>
                    task.id ===
                    `upload-${backingUpGame.rawgId}-${Date.now()}` /* (Ensure you match the right ID here in practice) */
                      ? { ...task, status: 'error' }
                      : task
                  )
                )
              }
            }}
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

            {/* TEMPORARY TEST BUTTONS */}
            <button
              onClick={handleTestBackup}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium shadow"
            >
              TEST BACKUP ENGINE
            </button>

            <button
              onClick={handleTestRestore}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded font-medium shadow"
            >
              TEST RESTORE ENGINE
            </button>

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
                  {/* NEW: Pull & Heal from Cloud */}
                  <button
                    onClick={handlePullFromCloud}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded font-medium text-sm transition-colors shadow-lg"
                  >
                    Sync with Cloud Library
                  </button>
                  <button
                    onClick={handleGoogleLogout}
                    className="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded font-medium text-sm transition-colors border border-red-900/50"
                  >
                    Unlink Account
                  </button>
                  {/* NEW: Cloud Storage Manager Button */}
                  <button
                    onClick={() => setShowCloudManager(true)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium text-sm transition-colors border border-gray-600"
                  >
                    Manage Storage
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
    </MainLayout>
  )
}
