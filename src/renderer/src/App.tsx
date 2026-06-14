// src/renderer/src/App.tsx
import { useState, useEffect } from 'react'
import { AppSettings, NetworkTask, SystemNotification } from '../../shared/types'
import { LibraryData, GameEntry } from '../../shared/types'
import { RawgGame } from 'src/shared/rawg'
import { GameStatus } from '../../shared/types'
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
import { generateThemeMatrix } from './themeEngine'

export default function App() {
  const { currentPage, setCurrentPage } = useUI()
  const [selectedGame, setSelectedGame] = useState<any | null>(null)
  const [clickSource, setClickSource] = useState<'grid' | 'hero'>('grid')

  const [library, setLibrary] = useState<LibraryData | null>(null)
  const [syncState, setSyncState] = useState<SyncStatus>('idle')

  // Track which game is currently open in the modal
  const [, setManagingGame] = useState<GameEntry | null>(null)

  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(true)

  const [backingUpGame, setBackingUpGame] = useState<GameEntry | null>(null)
  const [showCloudManager, setShowCloudManager] = useState(false)

  const [activeCategory, setActiveCategory] = useState<{ id: string; title: string } | null>(null)

  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [networkTasks] = useState<NetworkTask[]>([])
  const [notifications, setNotifications] = useState<SystemNotification[]>([])

  const wallpaperUrl = settings?.preferences?.wallpaper
  const isVideo =
    wallpaperUrl?.toLowerCase().endsWith('.webm') || wallpaperUrl?.toLowerCase().endsWith('.mp4')

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
        } catch (e: any) {
          const errorMessage = String(e?.message || e)

          if (errorMessage.includes('AUTH_EXPIRED')) {
            console.error('Token expired. Severing connection.')
            // Force logout to delete the dead local token
            await handleGoogleLogout()
            // Alert the user
            pushNotification(
              'Uplink Severed',
              'Your Google Drive session has expired. Please re-authenticate in your Profile.',
              'error'
            )
          } else {
            console.error('Failed to pull latest cloud save on boot', e)
          }
        }
      }
      setIsAuthenticating(false)
    }

    checkAuthAndHydrate()
  }, [])

  // useEffect(() => {
  //   if (settings?.preferences) {
  //     const { theme, ecoMode } = settings.preferences
  //     const htmlElement = document.documentElement

  //     // 1. Clear existing theme classes
  //     htmlElement.classList.remove('theme-cyberpunk', 'theme-midnight')

  //     // 2. Apply the new theme class (if not default)
  //     if (theme !== 'default') {
  //       htmlElement.classList.add(`theme-${theme}`)
  //     }

  //     // 3. Inject Eco Mode flag
  //     htmlElement.setAttribute('data-eco', ecoMode ? 'true' : 'false')
  //   }
  // }, [settings?.preferences])

  useEffect(() => {
    if (settings?.preferences) {
      const { theme, ecoMode, customTheme } = settings.preferences
      const htmlElement = document.documentElement

      // 1. Inject Eco Mode flag
      htmlElement.setAttribute('data-eco', ecoMode ? 'true' : 'false')

      // 2. Custom Mathematical Theme Override
      if (customTheme?.enabled) {
        // Strip out standard theme classes to prevent conflicts
        htmlElement.classList.remove('theme-cyberpunk', 'theme-midnight')

        // Generate the matrix and inject it directly into the DOM as inline CSS variables
        const matrix = generateThemeMatrix(customTheme)
        if (matrix) {
          Object.entries(matrix).forEach(([key, value]) => {
            htmlElement.style.setProperty(key, value)
          })
        }
      }
      // 3. Standard Preset Themes
      else {
        // Purge any inline custom variables from the DOM so they don't bleed over
        const matrixKeys = [
          '--app-bg-primary',
          '--app-bg-secondary',
          '--app-bg-modifier',
          '--app-text-main',
          '--app-text-muted',
          '--app-accent',
          '--app-accent-hover',
          '--app-active-ambiance',
          '--app-danger'
        ]
        matrixKeys.forEach((key) => htmlElement.style.removeProperty(key))

        // Swap the standard tailwind classes
        htmlElement.classList.remove('theme-cyberpunk', 'theme-midnight')
        if (theme !== 'default') {
          htmlElement.classList.add(`theme-${theme}`)
        }
      }
    }
  }, [settings?.preferences])

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
            settings={settings}
            onUpdatePreferences={handleUpdatePreferences}
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
            settings={settings}
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
        return <SettingsView settings={settings} onUpdatePreferences={handleUpdatePreferences} />
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
      // FIX: Add the full AppSettings structure to the fallback
      const current: AppSettings = prev || {
        userProfile: { name: 'Player One', avatar: '' },
        preferences: { theme: 'default', ecoMode: false }
      }

      const updatedSettings: AppSettings = {
        ...current,
        userProfile: { ...current.userProfile, ...profileData }
      }

      // Fire and forget to the hard drive
      window.api.saveSettings(updatedSettings).catch(console.error)
      return updatedSettings
    })
  }

  const handleUpdatePreferences = (newPrefs: Partial<AppSettings['preferences']>) => {
    setSettings((prev) => {
      if (!prev) return prev
      const updated: AppSettings = {
        ...prev,
        preferences: { ...prev.preferences, ...newPrefs }
      }
      window.api.saveSettings(updated).catch(console.error)
      return updated
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

  const handleCloudFileDeleted = (fileId: string) => {
    setLibrary((prev) => {
      if (!prev) return prev
      const updatedGames = { ...prev.games }

      Object.values(updatedGames).forEach((game) => {
        if (game.cloudSaveId === fileId) {
          // FIX: Use null instead of undefined to satisfy the GameEntry interface
          updatedGames[game.rawgId] = { ...game, cloudSaveId: null }
        }
      })

      const updatedLibrary = { ...prev, games: updatedGames }
      window.api.saveLibrary(updatedLibrary).catch(console.error)
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

  if (!library) return <div className="p-8 text-white">Loading library...</div>

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-transparent">
      {/* --- SMART WALLPAPER ENGINE (Layer 0) --- */}
      {wallpaperUrl && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          {isVideo ? (
            <video
              src={wallpaperUrl}
              autoPlay
              loop
              muted
              className={`w-full h-full object-cover transition-opacity duration-1000 ${settings?.preferences?.ecoMode ? 'opacity-50 blur-sm' : 'opacity-100'}`}
            />
          ) : (
            <img
              src={wallpaperUrl}
              alt="Wallpaper"
              className={`w-full h-full object-cover transition-opacity duration-1000 ${settings?.preferences?.ecoMode ? 'opacity-50 blur-sm' : 'opacity-100'}`}
            />
          )}
          {/* Dark gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/80 pointer-events-none" />
        </div>
      )}

      {/* --- APP LAYOUT (Layer 10) --- */}
      <div className="relative z-10 w-full h-full">
        <MainLayout
          settings={settings}
          syncState={syncState}
          isAuthenticated={isAuthenticated}
          networkTasks={networkTasks}
          notifications={notifications}
          onMarkNotificationsRead={handleMarkNotificationsRead}
          onToggleEcoMode={(val) => handleUpdatePreferences({ ecoMode: val })}
        >
          {renderActiveView()}
        </MainLayout>
      </div>

      {/* --- GLOBAL MODALS --- */}
      {showCloudManager && (
        <CloudManagerModal
          onClose={() => setShowCloudManager(false)}
          onFileDeleted={handleCloudFileDeleted}
        />
      )}

      {backingUpGame && (
        <BackupModal
          game={backingUpGame}
          onClose={() => setBackingUpGame(null)}
          onSync={async (files) => {
            // 1. Trigger the upload
            const success = await window.api.syncGameSave(backingUpGame.rawgId, files)

            let newCloudId = backingUpGame.cloudSaveId

            // 2. THE FIX: If successful, instantly scan Drive for the newly minted file ID
            if (success) {
              try {
                const cloudFiles = await window.api.getCloudStorageStats()
                // Reconstruct the exact filename your backend uses
                const expectedFileName = `${backingUpGame.title.replace(/[^a-z0-9]/gi, '_')}_save.zip`
                const newlyUploadedFile = cloudFiles.find((file) => file.name === expectedFileName)

                if (newlyUploadedFile) {
                  newCloudId = newlyUploadedFile.id // Grab the ID!
                }
              } catch (error) {
                console.error('Failed to retrieve new cloud ID:', error)
              }
            }

            // 3. Update the game state with the new ID
            const updatedGame = {
              ...backingUpGame,
              updatedAt: Date.now(),
              cloudSaveId: newCloudId // <-- This instantly turns the button blue!
            }

            // 4. Save and close
            handleUpdateGame(updatedGame)
            setBackingUpGame(null)
          }}
        />
      )}
    </div>
  )
}
