import { app, shell, BrowserWindow, ipcMain, protocol, net, dialog } from 'electron'
import { join } from 'path'
import fsPath from 'path'
import fs from 'fs/promises'
import { pathToFileURL, fileURLToPath } from 'url'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

import { AppSettings, CloudSaveStat, FileNode, LibraryData, ScannedFile } from '../shared/types'
import { loginToGoogle, checkExistingAuth, logoutFromGoogle, cancelGoogleLogin } from './auth'
import {
  syncLibraryToDrive,
  downloadLibraryFromDrive,
  mergeLibraries,
  uploadSaveToDrive,
  testListHiddenFiles,
  downloadSaveFromDrive,
  getCloudStorageStats,
  deleteCloudSave
} from './drive'
import { scanSaveDirectory } from './scanner'
import { getDiscoverGames, getGameDetails, getGameScreenshots, searchGames } from './api'

// Get the secure path where the OS allows our app to save data
const userDataPath = app.getPath('userData')
const LIBRARY_FILE_PATH = join(userDataPath, 'library.json')
const SETTINGS_FILE_PATH = join(userDataPath, 'settings.json')

// Helper to get an empty library template
const getEmptyLibrary = (): LibraryData => ({
  lastUpdated: new Date().toISOString(),
  games: {}
})

const getDefaultSettings = (): AppSettings => ({
  userProfile: { name: 'Gamer 47', avatar: '' } // Uses your actual name as the default!
})

// Setup IPC Handlers before the window loads
function setupIpcHandlers() {
  ipcMain.handle('scan-directory', async (_, folderPath: string): Promise<FileNode[]> => {
    try {
      // 1. Read the directory contents
      const entries = await fs.readdir(folderPath, { withFileTypes: true })

      // 2. Map the raw Node.js dirents into our strictly typed FileNode array
      return entries.map((entry) => ({
        name: entry.name,
        path: join(folderPath, entry.name),
        isDirectory: entry.isDirectory()
      }))
    } catch (error) {
      console.error(`Failed to scan directory: ${folderPath}`, error)
      // Throwing here rejects the promise on the React side, allowing standard try/catch
      throw new Error(`Could not read directory: ${folderPath}`)
    }
  })

  // 1. Load Library
  ipcMain.handle('load-library', async (): Promise<LibraryData> => {
    try {
      const fileData = await fs.readFile(LIBRARY_FILE_PATH, 'utf-8')
      return JSON.parse(fileData) as LibraryData
    } catch (error: any) {
      // If the file doesn't exist yet (first launch), return an empty library
      if (error.code === 'ENOENT') {
        return getEmptyLibrary()
      }
      console.error('Error reading library:', error)
      throw new Error('Failed to load library data')
    }
  })

  ipcMain.handle('save-library', async (event, data: LibraryData): Promise<boolean> => {
    try {
      data.lastUpdated = new Date().toISOString()
      await fs.writeFile(LIBRARY_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8')

      const isLoggedIn = await checkExistingAuth()

      if (isLoggedIn) {
        // 1. Tell React we started syncing
        event.sender.send('sync-status-update', 'syncing')

        // 2. Run background sync with retries
        syncLibraryToDrive(data)
          .then(() => {
            // Tell React it worked
            event.sender.send('sync-status-update', 'success')
          })
          .catch((err) => {
            // Tell React all retries failed
            console.error('Background sync permanently failed:', err)
            event.sender.send('sync-status-update', 'error')
          })
      }

      return true
    } catch (error) {
      throw new Error('Failed to save library data')
    }
  })

  ipcMain.handle('load-settings', async (): Promise<AppSettings> => {
    try {
      const fileData = await fs.readFile(SETTINGS_FILE_PATH, 'utf-8')
      return JSON.parse(fileData) as AppSettings
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return getDefaultSettings()
      }
      console.error('Error reading settings:', error)
      return getDefaultSettings()
    }
  })

  ipcMain.handle('save-settings', async (_, data: AppSettings): Promise<boolean> => {
    try {
      const safeData = data || getDefaultSettings()

      await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(safeData, null, 2), 'utf-8')
      return true
    } catch (error) {
      console.error('Failed to save settings:', error)
      return false
    }
  })

  ipcMain.handle('force-sync', async (event): Promise<boolean> => {
    try {
      const isLoggedIn = await checkExistingAuth()
      if (!isLoggedIn) return false

      // 1. Tell React we are trying again
      event.sender.send('sync-status-update', 'syncing')

      // 2. Read the latest local data
      const fileData = await fs.readFile(LIBRARY_FILE_PATH, 'utf-8')
      const libraryData: LibraryData = JSON.parse(fileData)

      // 3. Attempt the upload
      await syncLibraryToDrive(libraryData)

      // 4. Success!
      event.sender.send('sync-status-update', 'success')
      return true
    } catch (error) {
      console.error('Manual force sync failed:', error)
      event.sender.send('sync-status-update', 'error')
      return false
    }
  })

  ipcMain.handle('import-wallpaper', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Select Custom Wallpaper',
        properties: ['openFile'],
        filters: [{ name: 'Media', extensions: ['jpg', 'png', 'mp4', 'webm'] }]
      })

      if (canceled || filePaths.length === 0) return null

      const sourcePath = filePaths[0]
      const fileName = fsPath.basename(sourcePath)

      // Ensure a "wallpapers" directory exists inside the app's secure userData folder
      const wallpaperDir = fsPath.join(app.getPath('userData'), 'wallpapers')
      await fs.mkdir(wallpaperDir, { recursive: true })

      const destPath = fsPath.join(wallpaperDir, fileName)
      await fs.copyFile(sourcePath, destPath)

      // Return the safe local file protocol path so React can render it
      const safeUrl = pathToFileURL(destPath).href
      return safeUrl.replace('file://', 'local://')
    } catch (error) {
      console.error('Failed to import wallpaper:', error)
      return null
    }
  })

  ipcMain.handle('select-folder', async (): Promise<string | null> => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (canceled || filePaths.length === 0) {
      return null
    }
    return filePaths[0] // Return the selected folder path
  })

  ipcMain.handle('login-google', async () => {
    try {
      return await loginToGoogle()
    } catch (error) {
      console.error('Login failed:', error)
      throw new Error('Google Authentication Failed')
    }
  })

  ipcMain.handle('scan-save-directory', async (_, folderPath: string) => {
    try {
      // Run the pre-flight scan
      const tree = await scanSaveDirectory(folderPath)
      return tree
    } catch (error) {
      console.error('Failed to scan save directory:', error)
      throw new Error('Failed to read save folder. Check permissions.')
    }
  })

  ipcMain.handle(
    'sync-game-save',
    async (event, gameId: number, files: ScannedFile[]): Promise<boolean> => {
      try {
        // 1. Read the current library to get the game's details
        const fileData = await fs.readFile(LIBRARY_FILE_PATH, 'utf-8')
        const libraryData = JSON.parse(fileData)
        const game = libraryData.games[gameId]

        if (!game) throw new Error('Game not found in library')

        // 2. Define the progress callback to send events to React
        const handleProgress = (percent: number) => {
          event.sender.send(`save-progress-${gameId}`, percent)
        }

        // 3. Run the Streaming Engine
        const cloudSaveId = await uploadSaveToDrive(
          game.title,
          files,
          game.cloudSaveId,
          handleProgress
        )

        // 4. Update the game metadata
        game.cloudSaveId = cloudSaveId
        game.updatedAt = Date.now()

        // 5. Save the updated library locally and let the background JSON sync push it
        await fs.writeFile(LIBRARY_FILE_PATH, JSON.stringify(libraryData, null, 2), 'utf-8')
        syncLibraryToDrive(libraryData).catch((err) =>
          console.error('Background JSON sync failed:', err)
        )

        return true
      } catch (error) {
        console.error('Failed to sync game save:', error)
        throw new Error('Save upload failed')
      }
    }
  )

  ipcMain.handle(
    'restore-game-save',
    async (event, gameId: number, gameTitle: string, cloudSaveId: string): Promise<boolean> => {
      try {
        // 1. Ask the user where they want to save the ZIP file
        const { canceled, filePath } = await dialog.showSaveDialog({
          title: `Download ${gameTitle} Save Data`,
          defaultPath: `${gameTitle.replace(/[^a-z0-9]/gi, '_')}_Backup.zip`,
          filters: [{ name: 'ZIP Archives', extensions: ['zip'] }]
        })

        // 2. If they hit "Cancel", just abort gracefully
        if (canceled || !filePath) return false

        // 3. Set up the progress event sender
        const handleProgress = (percent: number) => {
          event.sender.send(`restore-progress-${gameId}`, percent)
        }

        // 4. Execute the stream!
        await downloadSaveFromDrive(cloudSaveId, filePath, handleProgress)

        // 5. Open the folder automatically to show them the downloaded file (Great UX!)
        shell.showItemInFolder(filePath)

        return true
      } catch (error) {
        console.error('Failed to restore game save:', error)
        throw new Error('Save download failed')
      }
    }
  )

  ipcMain.handle('restore-from-cloud', async (): Promise<LibraryData | null> => {
    try {
      const isLoggedIn = await checkExistingAuth()
      if (!isLoggedIn) return null

      // 1. Read current Local Data
      const localFileData = await fs.readFile(LIBRARY_FILE_PATH, 'utf-8').catch(() => null)
      const localData: LibraryData = localFileData ? JSON.parse(localFileData) : getEmptyLibrary()

      // 2. Download Cloud Data
      const cloudData = await downloadLibraryFromDrive()

      // 3. SMART MERGE: Combine both histories (Local wins ties)
      const mergedData = cloudData ? mergeLibraries(localData, cloudData) : localData

      // 4. THE SELF-HEALING SWEEP (NEW)
      // Fetch all physical ZIPs sitting in Google Drive
      const cloudFiles = await getCloudStorageStats()

      let needsPush = false
      Object.values(mergedData.games).forEach((game) => {
        const expectedName = `${game.title.replace(/[^a-z0-9]/gi, '_')}_save.zip`
        const match = cloudFiles.find((f) => f.name === expectedName)

        // Scenario A: Found an orphan file in Drive, link it!
        if (!game.cloudSaveId && match) {
          game.cloudSaveId = match.id
          needsPush = true
        }
        // Scenario B: JSON says a file exists, but it was deleted from Drive. Unlink it!
        else if (game.cloudSaveId && !match) {
          game.cloudSaveId = null
          needsPush = true
        }
      })

      // 5. Save merged & healed result locally
      await fs.writeFile(LIBRARY_FILE_PATH, JSON.stringify(mergedData, null, 2), 'utf-8')

      // 6. Push back to Cloud ONLY if we made healing changes or merged new data
      if (needsPush || cloudData) {
        syncLibraryToDrive(mergedData).catch((err) =>
          console.error('Post-merge cloud push failed:', err)
        )
      }

      return mergedData
    } catch (error) {
      console.error('Cloud hydration/merge failed:', error)
      throw error
    }
  })

  // --- AVATAR ENGINE ---
  ipcMain.handle('select-avatar', async () => {
    try {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: 'Select Profile Picture',
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp'] }]
      })

      if (canceled || filePaths.length === 0) return null

      const sourcePath = filePaths[0]
      const ext = fsPath.extname(sourcePath)

      // Secure local caching directory
      const avatarDir = fsPath.join(app.getPath('userData'), 'avatars')
      await fs.mkdir(avatarDir, { recursive: true })

      // Create a unique cached file
      const destPath = fsPath.join(avatarDir, `avatar_${Date.now()}${ext}`)
      await fs.copyFile(sourcePath, destPath)

      const safeUrl = pathToFileURL(destPath).href
      return safeUrl.replace('file://', 'local://')
    } catch (error) {
      console.error('Failed to import avatar:', error)
      return null
    }
  })

  ipcMain.handle('save-cropped-avatar', async (_, base64Data: string) => {
    try {
      const avatarDir = fsPath.join(app.getPath('userData'), 'avatars')
      await fs.mkdir(avatarDir, { recursive: true })

      // Strip the metadata prefix (e.g., "data:image/png;base64,")
      const base64Image = base64Data.split(';base64,').pop()
      if (!base64Image) throw new Error('Invalid base64 data')

      // Save as a permanent PNG
      const destPath = fsPath.join(avatarDir, `avatar_cropped_${Date.now()}.png`)
      await fs.writeFile(destPath, base64Image, { encoding: 'base64' })

      // Format safely for the custom local:// protocol
      const safeUrl = pathToFileURL(destPath).href
      return safeUrl.replace('file://', 'local://')
    } catch (error) {
      console.error('Failed to save cropped avatar:', error)
      return null
    }
  })

  ipcMain.handle('download-avatar-url', async (_, imageUrl: string) => {
    try {
      // Native Node fetch to grab the image/GIF from the web
      const response = await fetch(imageUrl)
      if (!response.ok) throw new Error('Failed to fetch image')

      const arrayBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const avatarDir = fsPath.join(app.getPath('userData'), 'avatars')
      await fs.mkdir(avatarDir, { recursive: true })

      // Extract extension from URL, default to .png if missing
      const urlExt = imageUrl.split('.').pop()?.split('?')[0] || 'png'
      const ext = ['gif', 'png', 'jpg', 'jpeg', 'webp'].includes(urlExt.toLowerCase())
        ? `.${urlExt}`
        : '.png'

      const destPath = fsPath.join(avatarDir, `avatar_${Date.now()}${ext}`)
      await fs.writeFile(destPath, buffer)

      const safeUrl = pathToFileURL(destPath).href
      return safeUrl.replace('file://', 'local://')
    } catch (error) {
      console.error('Avatar URL download failed:', error)
      return null
    }
  })

  ipcMain.handle('get-avatar-history', async () => {
    try {
      const avatarDir = fsPath.join(app.getPath('userData'), 'avatars')
      // Ensure the directory exists so it doesn't crash on first run
      await fs.mkdir(avatarDir, { recursive: true })

      const files = await fs.readdir(avatarDir)

      // Convert all physical files into secure local:// URLs
      return files.map((file) => {
        const filePath = fsPath.join(avatarDir, file)
        const safeUrl = pathToFileURL(filePath).href
        return safeUrl.replace('file://', 'local://')
      })
    } catch (error) {
      console.error('Failed to read avatar history:', error)
      return []
    }
  })

  ipcMain.handle('delete-avatar', async (_, avatarUrl: string) => {
    try {
      // 1. Translate local:// back to a physical OS path
      const fileUrl = avatarUrl.replace('local://', 'file://').replace(/\\/g, '/')
      const filePath = fileURLToPath(fileUrl)

      // 2. SECURITY CHECK: Ensure they are only deleting from the app's secure folder
      if (!filePath.startsWith(app.getPath('userData'))) return false

      // 3. Delete the file
      await fs.unlink(filePath)
      return true
    } catch (error) {
      console.error('Failed to delete avatar:', error)
      return false
    }
  })

  ipcMain.handle('get-cloud-stats', async (): Promise<CloudSaveStat[]> => {
    return await getCloudStorageStats()
  })

  ipcMain.handle('delete-cloud-save', async (_, fileId: string): Promise<boolean> => {
    return await deleteCloudSave(fileId)
  })

  ipcMain.handle(
    'get-discover-games',
    async (_, category: string, page: number, forceRefresh?: boolean) => {
      return await getDiscoverGames(category, forceRefresh, page)
    }
  )

  ipcMain.handle('get-game-details', async (_event, id: number) => {
    return await getGameDetails(id)
  })

  ipcMain.handle('get-game-screenshots', async (_event, id: number) => {
    return await getGameScreenshots(id)
  })

  ipcMain.handle('search-games', async (_, query: string, forceRefresh?: boolean) => {
    return await searchGames(query, forceRefresh)
  })

  ipcMain.handle('check-google-auth', async () => await checkExistingAuth())
  ipcMain.handle('logout-google', async () => await logoutFromGoogle())
  ipcMain.handle('cancel-google-login', () => {
    cancelGoogleLogin()
  })

  // Temporary testing function
  // TODO: Hooking up the UI of the zipping logic
  setTimeout(() => {
    testListHiddenFiles()
  }, 5000)
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? {} : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local',
    privileges: {
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true, // This allows the <img> tag to bypass Content Security Policy blocks
      corsEnabled: true
    }
  }
])

app.whenReady().then(() => {
  // Set app user model id for windows

  protocol.handle('local', (request) => {
    try {
      // 1. Convert local:// back to standard file:// and fix any legacy backslashes
      const fileUrl = request.url.replace('local://', 'file://').replace(/\\/g, '/')

      // 2. Safely decode the Web URL back to a native Windows/Mac OS file path
      const filePath = fileURLToPath(fileUrl)

      // 3. SECURITY CHECK
      if (!filePath.startsWith(app.getPath('userData'))) {
        console.error('Blocked unauthorized local file access:', filePath)
        return new Response('Access Denied', { status: 403 })
      }

      // 4. Serve the file securely
      return net.fetch(fileUrl)
    } catch (error) {
      console.error('Failed to parse local protocol URL:', error)
      return new Response('Bad Request', { status: 400 })
    }
  })

  setupIpcHandlers()
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
