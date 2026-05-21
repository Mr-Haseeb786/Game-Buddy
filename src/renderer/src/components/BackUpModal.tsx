// src/renderer/src/components/BackupModal.tsx
import { useState, useEffect, useMemo, useRef } from 'react'
import { GameEntry, ScannedFolder, ScannedFile } from '../../../shared/types'
import { formatBytes, formatTimeAgo, getBaseNameColor } from '../utils'
import {
  CheckSquare,
  Square,
  Folder,
  File as FileIcon,
  Lightbulb,
  ChevronRight,
  ChevronDown
} from 'lucide-react'

interface BackupModalProps {
  game: GameEntry
  onClose: () => void
  onSync: (checkedFiles: ScannedFile[]) => void
}

export default function BackupModal({ game, onClose, onSync }: BackupModalProps) {
  const [tree, setTree] = useState<ScannedFolder | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkedPaths, setCheckedPaths] = useState<Set<string>>(new Set())
  const [baseNameCounts, setBaseNameCounts] = useState<Record<string, number>>({})

  const hasInitialized = useRef(false)

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const initializeBackup = async () => {
      let targetPath = game.savePathDesktop

      // If first time, prompt for folder
      if (!targetPath) {
        targetPath = await window.api.selectFolder()
        if (!targetPath) {
          onClose() // User cancelled folder selection
          return
        }
      }

      // Run the Pre-Flight Scanner
      const scannedTree = await window.api.scanSaveDirectory(targetPath)
      if (scannedTree) {
        setTree(scannedTree)

        // 1. Calculate Top 5 Auto-Checks and Base Name groupings
        const initialChecked = new Set<string>()
        const nameCounts: Record<string, number> = {}

        const traverseAndCalculate = (folder: ScannedFolder) => {
          // Add top 5 recent files in this specific folder to checked list
          folder.files.slice(0, 5).forEach((f) => initialChecked.add(f.absolutePath))

          // Count base names for suggestions
          folder.files.forEach((f) => {
            nameCounts[f.baseName] = (nameCounts[f.baseName] || 0) + 1
          })

          folder.subfolders.forEach(traverseAndCalculate)
        }

        traverseAndCalculate(scannedTree)
        setCheckedPaths(initialChecked)
        setBaseNameCounts(nameCounts)
      }
      setLoading(false)
    }

    initializeBackup()
  }, [game])

  const toggleCheck = (absolutePath: string) => {
    const newChecked = new Set(checkedPaths)
    if (newChecked.has(absolutePath)) newChecked.delete(absolutePath)
    else newChecked.add(absolutePath)
    setCheckedPaths(newChecked)
  }

  const handleSyncClick = () => {
    // Extract the actual file objects that are currently checked
    const selectedFiles: ScannedFile[] = []
    const extractChecked = (folder: ScannedFolder) => {
      folder.files.forEach((f) => {
        if (checkedPaths.has(f.absolutePath)) selectedFiles.push(f)
      })
      folder.subfolders.forEach(extractChecked)
    }
    if (tree) extractChecked(tree)

    onSync(selectedFiles)
  }

  // NEW: Dynamically calculate total bytes of checked files
  const totalSelectedBytes = useMemo(() => {
    if (!tree) return 0
    let sum = 0

    const calculateSum = (folder: ScannedFolder) => {
      folder.files.forEach((f) => {
        if (checkedPaths.has(f.absolutePath)) sum += f.sizeBytes
      })
      folder.subfolders.forEach(calculateSum)
    }

    calculateSum(tree)
    return sum
  }, [tree, checkedPaths])

  // --- RECURSIVE FOLDER COMPONENT ---
  const FolderNode = ({ folder }: { folder: ScannedFolder }) => {
    const [expanded, setExpanded] = useState(true)
    const [visibleLimit, setVisibleLimit] = useState(10)

    const visibleFiles = folder.files.slice(0, visibleLimit)
    const hasMore = folder.files.length > visibleLimit

    return (
      <div className="ml-4 mt-2">
        <div
          className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white mb-2"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <Folder size={18} className="text-blue-400" />
          <span className="font-semibold">{folder.name || 'Root Save Folder'}</span>
        </div>

        {expanded && (
          <div className="ml-6 border-l border-gray-700 pl-4">
            {/* Render Files */}
            {visibleFiles.map((file) => {
              const isChecked = checkedPaths.has(file.absolutePath)
              const isTop5 = folder.files.findIndex((f) => f.absolutePath === file.absolutePath) < 5
              const isSuggested = !isChecked && baseNameCounts[file.baseName] > 1
              const suggestionColor = getBaseNameColor(file.baseName)

              return (
                <div
                  key={file.absolutePath}
                  className="flex items-center justify-between py-1 group hover:bg-gray-800 rounded px-2 -ml-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleCheck(file.absolutePath)}
                      className="text-gray-400 hover:text-white"
                    >
                      {isChecked ? (
                        <CheckSquare size={16} className="text-blue-500" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                    <FileIcon size={16} className="text-gray-500" />
                    <span
                      className={`text-sm ${isChecked ? 'text-white font-medium' : 'text-gray-400'}`}
                    >
                      {file.name}
                    </span>

                    {/* The Suggestion Icon */}
                    {isSuggested && (
                      <div
                        className="flex items-center gap-1 bg-gray-900 px-2 py-0.5 rounded text-xs ml-2 border border-gray-700"
                        title={`Related to ${file.baseName}`}
                      >
                        <Lightbulb size={12} className={suggestionColor} />
                        <span className={suggestionColor}>Suggested</span>
                      </div>
                    )}
                  </div>

                  {/* File Metadata (Size and Time) */}
                  <div className="flex gap-4 text-xs text-gray-500 font-mono">
                    <span className="w-16 text-right">{formatBytes(file.sizeBytes, 0)}</span>
                    <span className="w-24 text-right">{formatTimeAgo(file.mtimeMs)}</span>
                  </div>
                </div>
              )
            })}

            {/* Lazy Load Button */}
            {hasMore && (
              <button
                onClick={() => setVisibleLimit((prev) => prev + 10)}
                className="text-xs text-blue-400 hover:text-blue-300 mt-2 ml-6 font-medium"
              >
                + Show {Math.min(10, folder.files.length - visibleLimit)} more files
              </button>
            )}

            {/* Render Subfolders */}
            {folder.subfolders.map((sub) => (
              <FolderNode key={sub.absolutePath} folder={sub} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col border border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900 rounded-t-lg">
          <div>
            <h2 className="text-xl font-bold text-white">Sync Save Data</h2>
            <p className="text-sm text-gray-400 mt-1">
              Review the files to be compressed and uploaded to Google Drive.
            </p>
          </div>
        </div>

        {/* Scrollable Tree View */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-[#0f1115]">
          {loading ? (
            <div className="flex items-center gap-3 text-blue-400 animate-pulse">
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              Scanning save directory...
            </div>
          ) : !tree ? (
            <div className="text-red-400">Failed to load directory.</div>
          ) : (
            <FolderNode folder={tree} />
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-800 bg-gray-900 flex justify-between items-center rounded-b-lg">
          {/* NEW: Updated stats display */}
          <div className="flex flex-col">
            <div className="text-sm text-gray-400">
              <span className="text-white font-medium">{checkedPaths.size}</span> files selected
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Uncompressed Size:{' '}
              <span className="text-gray-300">{formatBytes(totalSelectedBytes)}</span>
            </div>
          </div>
          {/* <div className="text-sm text-gray-400">
            <span className="text-white font-medium">{checkedPaths.size}</span> files selected
          </div> */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSyncClick}
              disabled={checkedPaths.size === 0 || loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors shadow-lg"
            >
              Sync to Cloud
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
