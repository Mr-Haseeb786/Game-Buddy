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
  syncGameSave: (gameId: number, files: ScannedFile[]) => Promise<boolean>
  onSaveProgress: (gameId: number, callback: (percent: number) => void) => () => void // Returns a cleanup function
  restoreGameSave: (gameId: number, gameTitle: string, cloudSaveId: string) => Promise<boolean>
  onRestoreProgress: (gameId: number, callback: (percent: number) => void) => () => void
  getCloudStorageStats: () => Promise<CloudSaveStat[]>
  deleteCloudSave: (fileId: string) => Promise<boolean>
  importWallpaper: () => Promise<string | null>
  getDiscoverGames: (
    category: string,
    page: number,
    forceRefresh?: boolean
  ) => Promise<ApiResponse<RawgGameList>>
  searchGames: (query: string, forceRefresh?: boolean) => Promise<ApiResponse<RawgGameList>>
  getGameDetails: (id: number) => Promise<any>
  getGameScreenshots: (id: number) => Promise<any>
  selectAvatar: () => Promise<string | null>
  downloadAvatarUrl: (url: string) => Promise<string | null>
  loadSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<boolean>
  saveCroppedAvatar: (base64Data: string) => Promise<string | null>
  getAvatarHistory: () => Promise<string[]>
  deleteAvatar: (avatarUrl: string) => Promise<boolean>
}

export interface NetworkTask {
  id: string // Usually the rawgId combined with a timestamp
  title: string // e.g., "The Witcher 3: Wild Hunt"
  type: 'upload' | 'download' | 'system'
  progress: number // 0 to 100
  status: 'active' | 'completed' | 'error'
}

export interface SystemNotification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: number
  read: boolean
}

export interface UserProfile {
  name: string
  avatar: string
}

export interface AppSettings {
  userProfile: UserProfile
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

export interface RawgGameList {
  results: any[]
  next: string | null
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
  background_image: string | null
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

export interface CloudSaveStat {
  id: string
  name: string
  sizeBytes: number
  modifiedTime: string // ISO Date string from Google
}
