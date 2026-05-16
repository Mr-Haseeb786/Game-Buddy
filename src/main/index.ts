import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import fs from 'fs/promises'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import { FileNode, LibraryData } from '../shared/types'

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

  ipcMain.handle('save-library', async (_, data: LibraryData): Promise<boolean> => {
    try {
      // Update the timestamp right before saving
      data.lastUpdated = new Date().toISOString()

      // Write the file with 2-space formatting for readability
      await fs.writeFile(LIBRARY_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8')
      return true
    } catch (error) {
      console.error('Error saving library:', error)
      throw new Error('Failed to save library data')
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
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
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
