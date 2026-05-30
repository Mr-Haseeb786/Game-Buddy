// src/renderer/src/components/CloudManagerModal.tsx
import { useState, useEffect } from 'react'
import { CloudSaveStat } from '../../../shared/types'
import { formatBytes } from '../utils'
// NEW IMPORTS: Added Trash2 and AlertTriangle
import { Cloud, X, Database, Clock, HardDrive, Trash2, AlertTriangle } from 'lucide-react'
import { createPortal } from 'react-dom'

interface CloudManagerModalProps {
  onClose: () => void
  onFileDeleted: (fileId: string) => void
}

export default function CloudManagerModal({ onClose, onFileDeleted }: CloudManagerModalProps) {
  const [stats, setStats] = useState<CloudSaveStat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // NEW STATE: For the custom delete modal
  const [deletingFile, setDeletingFile] = useState<CloudSaveStat | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await window.api.getCloudStorageStats()
        setStats(data)
      } catch (err) {
        setError('Failed to load cloud storage data.')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [])

  // NEW HANDLER: The delete execution
  const handleConfirmDelete = async () => {
    if (!deletingFile) return

    setIsDeleting(true)
    try {
      const success = await window.api.deleteCloudSave(deletingFile.id)
      if (success) {
        // Optimistic UI update: Remove it from the local array instantly
        setStats((prev) => prev.filter((stat) => stat.id !== deletingFile.id))

        // Tell App.tsx to scrub this ID from the library database
        onFileDeleted(deletingFile.id)

        setDeletingFile(null)
      }
    } catch (err) {
      console.error(err)
      alert('Failed to delete the file. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const totalUsage = stats.reduce((sum, stat) => sum + stat.sizeBytes, 0)

  const modalContent = (
    <div className="fixed inset-0 w-screen h-screen z-9999 bg-black/80 flex items-center justify-center p-4">
      {/* Notice the added "relative" class here to anchor our custom overlay */}
      <div className="relative bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl flex flex-col border border-gray-700">
        {/* --- NEW: CUSTOM DELETE CONFIRMATION OVERLAY --- */}
        {deletingFile && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-lg z-20 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-red-900/50 p-6 rounded-lg shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="text-red-500" size={28} />
                <h3 className="text-xl font-bold text-white">Delete Cloud Archive?</h3>
              </div>
              <p className="text-gray-300 mb-6">
                Are you sure you want to permanently delete{' '}
                <span className="text-white font-semibold">"{deletingFile.name}"</span>? This will
                free up{' '}
                <span className="text-blue-400 font-mono">
                  {formatBytes(deletingFile.sizeBytes)}
                </span>{' '}
                of Drive space.
                <br />
                <br />
                <span className="text-red-400 font-medium">This action cannot be undone.</span>
              </p>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setDeletingFile(null)}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 flex items-center gap-2 text-white rounded text-sm font-medium transition-colors shadow-lg"
                >
                  {isDeleting ? (
                    <>
                      <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} /> Delete Permanently
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* --- END OVERLAY --- */}

        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-900 rounded-t-lg">
          <div className="flex items-center gap-3">
            <Cloud className="text-blue-400" size={28} />
            <div>
              <h2 className="text-xl font-bold text-white">Drive Storage Manager</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Manage your backed up save files in Google Drive
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] custom-scrollbar bg-[#0f1115]">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-blue-400 animate-pulse gap-3">
              <span className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              Scanning Google Drive...
            </div>
          ) : error ? (
            <div className="text-red-400 py-8 text-center">{error}</div>
          ) : stats.length === 0 ? (
            <div className="text-gray-500 py-12 text-center flex flex-col items-center">
              <Database size={48} className="mb-4 opacity-20" />
              <p>No game backups found in your Drive yet.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-sm">
                  <th className="pb-3 font-medium">Archive Name</th>
                  <th className="pb-3 font-medium text-right">Modified Date</th>
                  <th className="pb-3 font-medium text-right">Size</th>
                  <th className="pb-3 font-medium text-right w-12"></th> {/* NEW: Actions Column */}
                </tr>
              </thead>
              <tbody className="text-sm">
                {stats.map((stat) => (
                  <tr
                    key={stat.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors group"
                  >
                    <td className="py-4 text-gray-200 font-medium flex items-center gap-3">
                      <HardDrive size={16} className="text-gray-500" />
                      {stat.name}
                    </td>
                    <td className="py-4 text-gray-400 text-right">
                      {new Date(stat.modifiedTime).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-4 text-gray-300 text-right font-mono pr-4">
                      {formatBytes(stat.sizeBytes)}
                    </td>
                    {/* NEW: Trash Button */}
                    <td className="py-4 text-right">
                      <button
                        onClick={() => setDeletingFile(stat)}
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete this archive"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-900 rounded-b-lg flex justify-between items-center">
          <div className="text-sm text-gray-400 flex items-center gap-2">
            <Clock size={16} /> Total Cloud Usage:
            <span className="text-white font-mono font-medium ml-1">{formatBytes(totalUsage)}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors border border-gray-700"
          >
            Close Manager
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
