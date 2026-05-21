import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import fs from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

import { FileNode, LibraryData, ScannedFile } from '../shared/types'
import { loginToGoogle, checkExistingAuth, logoutFromGoogle, cancelGoogleLogin } from './auth'
import {
  syncLibraryToDrive,
  downloadLibraryFromDrive,
  mergeLibraries,
  uploadSaveToDrive,
  testListHiddenFiles
} from './drive'
import { scanSaveDirectory } from './scanner'

// Get the secure path where the OS allows our app to save data
const userDataPath = app.getPath('userData')
const LIBRARY_FILE_PATH = join(userDataPath, 'library.json')

// Helper to get an empty library template
const getEmptyLibrary = (): LibraryData => ({
  lastUpdated: new Date().toISOString(),
  games: {}
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

  ipcMain.handle('restore-from-cloud', async (): Promise<LibraryData | null> => {
    try {
      const isLoggedIn = await checkExistingAuth()
      if (!isLoggedIn) return null

      // 1. Read current Local Data
      const localFileData = await fs.readFile(LIBRARY_FILE_PATH, 'utf-8')
      const localData: LibraryData = JSON.parse(localFileData)

      // 2. Download Cloud Data
      const cloudData = await downloadLibraryFromDrive()

      if (!cloudData) {
        // No cloud data yet? Then Local is the absolute truth. Push it up.
        await syncLibraryToDrive(localData)
        return localData
      }

      // 3. SMART MERGE: Combine both histories
      const mergedData = mergeLibraries(localData, cloudData)

      // 4. Save merged result locally (Overwriting the old local file)
      await fs.writeFile(LIBRARY_FILE_PATH, JSON.stringify(mergedData, null, 2), 'utf-8')

      // 5. Push merged result back to Google Drive
      // (We do this asynchronously in the background so the UI doesn't hang)
      syncLibraryToDrive(mergedData).catch((err) =>
        console.error('Post-merge cloud push failed:', err)
      )

      return mergedData
    } catch (error) {
      console.error('Cloud hydration/merge failed:', error)
      throw error
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
app.whenReady().then(() => {
  // Set app user model id for windows
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
