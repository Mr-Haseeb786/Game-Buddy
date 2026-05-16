// import { ElectronAPI } from '@electron-toolkit/preload'
import { ElectronAPI } from '../shared/types'

declare global {
  interface Window {
    // electron: ElectronAPI
    api: ElectronAPI
  }
}
