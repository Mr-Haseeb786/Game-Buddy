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
  scanSaveDirectory: (folderPath: string) => Promise<ScannedFolder | null>
}

export type GameStatus = 'playing' | 'planning' | 'paused' | 'completed' | 'dropped'
export interface GameEntry {
  rawgId: number
  title: string
  status: GameStatus
  timePlayedMinutes: number
  savePathDesktop: string | null
  updatedAt: number
  saveExtension: string | null
  cloudSaveId: string | null
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error'
export interface LibraryData {
  lastUpdated: string
  games: Record<string, GameEntry> // Key will be the rawgId or game slug
}

// Represents a single physical file
export interface ScannedFile {
  name: string
  absolutePath: string
  relativePath: string // e.g., "S1/save1.sav" (Crucial for the ZIP structure)
  sizeBytes: number
  mtimeMs: number // Epoch timestamp for exact sorting
  baseName: string // The strict last-dot parsed name (e.g., "q.save.0")
}

// Represents a folder containing files and other subfolders
export interface ScannedFolder {
  name: string
  absolutePath: string
  relativePath: string
  files: ScannedFile[]
  subfolders: ScannedFolder[]
}
