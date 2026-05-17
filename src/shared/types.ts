// Represents a single file or folder found in a directory
export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
}
// Defines the exact shape of our securely exposed API
export interface ElectronAPI {
  scanDirectory: (folderPath: string) => Promise<FileNode[]>
  loadLibrary: () => Promise<LibraryData>
  saveLibrary: (data: LibraryData) => Promise<boolean>
  selectFolder: () => Promise<string | null>
  loginToGoogleDrive: () => Promise<boolean>
  checkGoogleAuth: () => Promise<boolean>
  logoutGoogleDrive: () => Promise<boolean>
  cancelGoogleLogin: () => Promise<void>
  onSyncStatusUpdate: (callback: (status: SyncStatus) => void) => void
  forceSync: () => Promise<boolean>
  restoreFromCloud: () => Promise<LibraryData | null>
}

export type GameStatus = 'playing' | 'planning' | 'paused' | 'completed' | 'dropped'
export interface GameEntry {
  rawgId: number
  title: string
  status: GameStatus
  timePlayedMinutes: number
  savePathDesktop: string | null
  updatedAt: number
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'
export interface LibraryData {
  lastUpdated: string
  games: Record<string, GameEntry> // Key will be the rawgId or game slug
}
