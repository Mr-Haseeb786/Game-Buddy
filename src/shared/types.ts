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
}

export type GameStatus = 'playing' | 'planning' | 'paused' | 'completed' | 'dropped'
export interface GameEntry {
  rawgId: number
  title: string
  status: GameStatus
  timePlayedMinutes: number
  savePathDesktop: string | null
}
export interface LibraryData {
  lastUpdated: string
  games: Record<string, GameEntry> // Key will be the rawgId or game slug
}
