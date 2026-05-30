import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { ElectronAPI, LibraryData } from '../shared/types'

// Build the API object conforming to our strict interface
const api: ElectronAPI = {
  scanDirectory: (folderPath: string) => ipcRenderer.invoke('scan-directory', folderPath),
  loadLibrary: () => ipcRenderer.invoke('load-library'),
  saveLibrary: (data: LibraryData) => ipcRenderer.invoke('save-library', data),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  loginToGoogleDrive: () => ipcRenderer.invoke('login-google'),
  checkGoogleAuth: () => ipcRenderer.invoke('check-google-auth'),
  logoutGoogleDrive: () => ipcRenderer.invoke('logout-google'),
  cancelGoogleLogin: () => ipcRenderer.invoke('cancel-google-login'),
  onSyncStatusUpdate: (callback) => {
    // Strip the event object and just pass the status string to React
    ipcRenderer.on('sync-status-update', (_event, status) => callback(status))
  },
  forceSync: () => ipcRenderer.invoke('force-sync'),
  restoreFromCloud: () => ipcRenderer.invoke('restore-from-cloud'),
  scanSaveDirectory: (folderPath) => ipcRenderer.invoke('scan-save-directory', folderPath),
  syncGameSave: (gameId, files) => ipcRenderer.invoke('sync-game-save', gameId, files),

  onSaveProgress: (gameId, callback) => {
    const channel = `save-progress-${gameId}`
    const listener = (_event: any, percent: number) => callback(percent)
    ipcRenderer.on(channel, listener)

    // Return a function so React can clean up the listener when the component unmounts
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  },
  restoreGameSave: (gameId, gameTitle, cloudSaveId) =>
    ipcRenderer.invoke('restore-game-save', gameId, gameTitle, cloudSaveId),

  onRestoreProgress: (gameId, callback) => {
    const channel = `restore-progress-${gameId}`
    const listener = (_event: any, percent: number) => callback(percent)
    ipcRenderer.on(channel, listener)
    return () => ipcRenderer.removeListener(channel, listener)
  },

  getDiscoverGames: (category: string, page: number) =>
    ipcRenderer.invoke('get-discover-games', category, page),
  searchGames: (query, forceRefresh) => ipcRenderer.invoke('search-games', query, forceRefresh),

  // --- NEW RAWG API ENDPOINTS ---
  getGameDetails: (id: number) => ipcRenderer.invoke('get-game-details', id),
  getGameScreenshots: (id: number) => ipcRenderer.invoke('get-game-screenshots', id),

  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (data: any) => ipcRenderer.invoke('save-settings', data),

  importWallpaper: () => ipcRenderer.invoke('import-wallpaper'),
  getCloudStorageStats: () => ipcRenderer.invoke('get-cloud-stats'),
  deleteCloudSave: (fileId) => ipcRenderer.invoke('delete-cloud-save', fileId),
  selectAvatar: () => ipcRenderer.invoke('select-avatar'),
  saveCroppedAvatar: (base64Data: string) => ipcRenderer.invoke('save-cropped-avatar', base64Data),
  downloadAvatarUrl: (url: string) => ipcRenderer.invoke('download-avatar-url', url),
  getAvatarHistory: () => ipcRenderer.invoke('get-avatar-history'),
  deleteAvatar: (url: string) => ipcRenderer.invoke('delete-avatar', url)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
