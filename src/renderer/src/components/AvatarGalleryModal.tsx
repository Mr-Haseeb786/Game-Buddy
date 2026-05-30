import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react'

interface AvatarGalleryModalProps {
  onClose: () => void
  onSelect: (url: string) => void
  currentAvatar: string
}

export default function AvatarGalleryModal({
  onClose,
  onSelect,
  currentAvatar
}: AvatarGalleryModalProps) {
  const [avatars, setAvatars] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      const history = await window.api.getAvatarHistory()
      // Sort so newest are likely first (assuming timestamps in filenames)
      setAvatars(history.reverse())
      setLoading(false)
    }
    fetchHistory()
  }, [])

  const handleDelete = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation()
    setDeletingId(url)
    const success = await window.api.deleteAvatar(url)
    if (success) {
      setAvatars((prev) => prev.filter((a) => a !== url))
    }
    setDeletingId(null)
  }

  const modalContent = (
    <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#121212] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-3xl max-h-[80vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <ImageIcon className="text-accent" size={20} /> Identity Archive
            </h3>
            <p className="text-sm text-white/50 mt-1">
              Select a previous avatar or manage your local storage.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Grid Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-white/50 gap-4">
              <Loader2 className="animate-spin" size={32} />
              <p>Scanning local archives...</p>
            </div>
          ) : avatars.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-white/30 gap-4">
              <ImageIcon size={48} className="opacity-20" />
              <p>No previous avatars found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {avatars.map((url) => (
                <div
                  key={url}
                  onClick={() => onSelect(url)}
                  className={`relative aspect-square rounded-2xl overflow-hidden group cursor-pointer border-2 transition-all duration-300 ${
                    url === currentAvatar
                      ? 'border-accent shadow-[0_0_15px_rgba(0,194,255,0.4)]'
                      : 'border-white/5 hover:border-white/30'
                  }`}
                >
                  <img src={url} alt="Avatar" className="w-full h-full object-cover" />

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="text-white font-bold text-sm tracking-widest uppercase">
                      Select
                    </span>
                  </div>

                  {/* Active Indicator */}
                  {url === currentAvatar && (
                    <div className="absolute top-2 left-2 bg-accent text-black text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg">
                      Active
                    </div>
                  )}

                  {/* Delete Button (Hidden if it is the currently active avatar to prevent UI breakage) */}
                  {url !== currentAvatar && (
                    <button
                      onClick={(e) => handleDelete(e, url)}
                      disabled={deletingId === url}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white/50 hover:text-white rounded-lg transition-colors backdrop-blur-md opacity-0 group-hover:opacity-100 z-10"
                    >
                      {deletingId === url ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
