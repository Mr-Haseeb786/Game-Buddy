import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { GameEntry, ScannedFolder, ScannedFile } from '../../../shared/types'
import { formatBytes, formatTimeAgo, getBaseNameColor } from '../utils'
import {
  CheckSquare,
  Square,
  Folder,
  File as FileIcon,
  Lightbulb,
  ChevronRight,
  ChevronDown,
  Loader2,
  CloudUpload
} from 'lucide-react'

interface BackupModalProps {
  game: GameEntry
  onClose: () => void
  onSync: (checkedFiles: ScannedFile[]) => Promise<void> | void
}

// --- 1. THE PERFORMANCE FIX: EXTRACTED & MEMOIZED NODE ---
// By moving this completely outside the main component, React stops destroying
// and rebuilding the DOM tree on every click.
const FolderNode = React.memo(
  ({
    folder,
    checkedPaths,
    baseNameCounts,
    isSyncing,
    toggleCheck
  }: {
    folder: ScannedFolder
    checkedPaths: Set<string>
    baseNameCounts: Record<string, number>
    isSyncing: boolean
    toggleCheck: (path: string) => void
  }) => {
    const [expanded, setExpanded] = useState(true)
    const [visibleLimit, setVisibleLimit] = useState(10)

    const visibleFiles = folder.files.slice(0, visibleLimit)
    const hasMore = folder.files.length > visibleLimit

    return (
      <div className="ml-4 mt-2">
        <div
          className="flex items-center gap-2 cursor-pointer text-gray-300 hover:text-white mb-2 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          <Folder size={18} className="text-blue-400 shrink-0" />
          <span className="font-semibold truncate">{folder.name || 'Root Save Folder'}</span>
        </div>

        {expanded && (
          <div className="ml-6 border-l border-gray-700/50 pl-4">
            {visibleFiles.map((file) => {
              const isChecked = checkedPaths.has(file.absolutePath)
              const isSuggested = !isChecked && baseNameCounts[file.baseName] > 1
              const suggestionColor = getBaseNameColor(file.baseName)

              return (
                <div
                  key={file.absolutePath}
                  className={`flex items-center justify-between py-1 group rounded px-2 -ml-2 transition-colors ${isSyncing ? 'opacity-50' : 'hover:bg-gray-800'}`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <button
                      onClick={() => toggleCheck(file.absolutePath)}
                      disabled={isSyncing}
                      className={`shrink-0 transition-colors ${isSyncing ? 'cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
                    >
                      {isChecked ? (
                        <CheckSquare size={16} className="text-blue-500" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>
                    <FileIcon size={16} className="text-gray-500 shrink-0" />
                    <span
                      className={`text-sm truncate ${isChecked ? 'text-white font-medium' : 'text-gray-400'}`}
                    >
                      {file.name}
                    </span>

                    {isSuggested && (
                      <div
                        className="shrink-0 flex items-center gap-1 bg-gray-900 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ml-2 border border-gray-700"
                        title={`Related to ${file.baseName}`}
                      >
                        <Lightbulb size={10} className={suggestionColor} />
                        <span className={suggestionColor}>Suggested</span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4 text-xs text-gray-500 font-mono shrink-0">
                    <span className="w-16 text-right">{formatBytes(file.sizeBytes, 0)}</span>
                    <span className="w-24 text-right">{formatTimeAgo(file.mtimeMs)}</span>
                  </div>
                </div>
              )
            })}

            {hasMore && (
              <button
                onClick={() => setVisibleLimit((prev) => prev + 10)}
                className="text-xs text-blue-400 hover:text-blue-300 mt-2 ml-6 font-medium transition-colors"
              >
                + Show {Math.min(10, folder.files.length - visibleLimit)} more files
              </button>
            )}

            {/* Recursive call MUST pass the props down */}
            {folder.subfolders.map((sub) => (
              <FolderNode
                key={sub.absolutePath}
                folder={sub}
                checkedPaths={checkedPaths}
                baseNameCounts={baseNameCounts}
                isSyncing={isSyncing}
                toggleCheck={toggleCheck}
              />
            ))}
          </div>
        )}
      </div>
    )
  }
)

export default function BackupModal({ game, onClose, onSync }: BackupModalProps) {
  const [tree, setTree] = useState<ScannedFolder | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  const [checkedPaths, setCheckedPaths] = useState<Set<string>>(new Set())
  const [baseNameCounts, setBaseNameCounts] = useState<Record<string, number>>({})

  const hasInitialized = useRef(false)

  useEffect(() => {
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const rootElement = document.getElementById('root')
    if (rootElement) rootElement.style.pointerEvents = 'none'

    return () => {
      document.body.style.overflow = originalOverflow
      if (rootElement) rootElement.style.pointerEvents = 'auto'
    }
  }, [])

  useEffect(() => {
    if (hasInitialized.current) return
    hasInitialized.current = true

    const initializeBackup = async () => {
      let targetPath = game.savePathDesktop

      if (!targetPath) {
        targetPath = await window.api.selectFolder()
        if (!targetPath) {
          onClose()
          return
        }
      }

      const scannedTree = await window.api.scanSaveDirectory(targetPath)
      if (scannedTree) {
        setTree(scannedTree)

        const initialChecked = new Set<string>()
        const nameCounts: Record<string, number> = {}

        const traverseAndCalculate = (folder: ScannedFolder) => {
          folder.files.slice(0, 5).forEach((f) => initialChecked.add(f.absolutePath))
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
  }, [game, onClose])

  // --- 2. OPTIMIZED TOGGLE FUNCTION ---
  // Using useCallback ensures this function's reference doesn't change on every render,
  // protecting our child components from unnecessary updates.
  const toggleCheck = useCallback(
    (absolutePath: string) => {
      if (isSyncing) return
      setCheckedPaths((prev) => {
        const newChecked = new Set(prev)
        if (newChecked.has(absolutePath)) newChecked.delete(absolutePath)
        else newChecked.add(absolutePath)
        return newChecked
      })
    },
    [isSyncing]
  )

  const handleSyncClick = async () => {
    if (isSyncing || checkedPaths.size === 0) return

    setIsSyncing(true)

    const selectedFiles: ScannedFile[] = []
    const extractChecked = (folder: ScannedFolder) => {
      folder.files.forEach((f) => {
        if (checkedPaths.has(f.absolutePath)) selectedFiles.push(f)
      })
      folder.subfolders.forEach(extractChecked)
    }
    if (tree) extractChecked(tree)

    try {
      await onSync(selectedFiles)
    } catch (error) {
      console.error('Backup failed:', error)
      setIsSyncing(false)
    }
  }

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

  const modalContent = (
    <div
      className="fixed inset-0 w-screen h-screen z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSyncing) onClose()
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-gray-900 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-3xl max-h-[85vh] flex flex-col border border-gray-700 overflow-hidden"
      >
        <div
          className={`p-6 border-b border-gray-800 flex justify-between items-center transition-colors duration-500 ${isSyncing ? 'bg-amber-500/5' : 'bg-gray-900'}`}
        >
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              Sync Save Data
              {isSyncing && (
                <span className="text-xs font-bold bg-amber-500/20 text-amber-400 px-2 py-1 rounded-md tracking-wider uppercase animate-pulse">
                  Processing
                </span>
              )}
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              Review the files to be compressed and uploaded to Google Drive.
            </p>
          </div>
        </div>

        {/* --- 3. HARDWARE ACCELERATED SCROLLING --- */}
        {/* 'will-change-transform' tells the GPU to handle the scroll rendering, eliminating frame drops */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar bg-[#0f1115] relative will-change-transform">
          {isSyncing && (
            <div className="absolute inset-0 z-10 bg-[#0f1115]/50 backdrop-blur-[1px] pointer-events-none" />
          )}

          {loading ? (
            <div className="flex items-center gap-3 text-blue-400 animate-pulse font-medium">
              <Loader2 size={18} className="animate-spin" />
              Scanning save directory...
            </div>
          ) : !tree ? (
            <div className="text-red-400 bg-red-500/10 p-4 rounded-lg border border-red-500/20">
              Failed to load directory.
            </div>
          ) : (
            <FolderNode
              folder={tree}
              checkedPaths={checkedPaths}
              baseNameCounts={baseNameCounts}
              isSyncing={isSyncing}
              toggleCheck={toggleCheck}
            />
          )}
        </div>

        <div className="p-5 border-t border-gray-800 bg-gray-900 flex justify-between items-center">
          <div className="flex flex-col">
            <div className="text-sm text-gray-400">
              <span className="text-white font-bold">{checkedPaths.size}</span> files selected
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              Uncompressed Size:{' '}
              <span className="text-gray-300 font-medium">{formatBytes(totalSelectedBytes)}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isSyncing}
              className="px-5 cursor-pointer py-2.5 rounded-lg text-sm font-bold text-gray-300 hover:bg-gray-800 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Cancel
            </button>

            <button
              onClick={handleSyncClick}
              disabled={checkedPaths.size === 0 || loading || isSyncing}
              className={`px-6 py-2.5 cursor-pointer rounded-lg text-sm font-bold transition-all shadow-lg flex items-center justify-center min-w-[140px] gap-2 ${
                isSyncing
                  ? 'bg-amber-500 text-amber-950 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-blue-900/20 hover:shadow-blue-900/40'
              }`}
            >
              {isSyncing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <CloudUpload size={16} />
                  Sync to Cloud
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
