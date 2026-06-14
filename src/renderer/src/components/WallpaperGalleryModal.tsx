import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { X, Trash2, Image as ImageIcon, Loader2, PlayCircle } from 'lucide-react'

interface WallpaperGalleryModalProps {
  onClose: () => void
  onSelect: (url: string) => void
  currentWallpaper: string | undefined
}

export default function WallpaperGalleryModal({
  onClose,
  onSelect,
  currentWallpaper
}: WallpaperGalleryModalProps) {
  const [wallpapers, setWallpapers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const fetchHistory = async () => {
      const history = await window.api.getWallpaperHistory()
      setWallpapers(history.reverse())
      setLoading(false)
    }
    fetchHistory()
  }, [])

  const handleDelete = async (e: React.MouseEvent, url: string) => {
    e.stopPropagation()
    setDeletingId(url)
    const success = await window.api.deleteWallpaper(url)
    if (success) {
      setWallpapers((prev) => prev.filter((w) => w !== url))
    }
    setDeletingId(null)
  }

  const isVideo = (url: string) =>
    url.toLowerCase().endsWith('.webm') || url.toLowerCase().endsWith('.mp4')

  const modalContent = (
    <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-[#121212] border border-white/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.8)] w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <ImageIcon className="text-accent" size={20} /> Environmental Archive
            </h3>
            <p className="text-sm text-white/50 mt-1">
              Select a previous background or manage local storage.
            </p>
          </div>
          <button
            onClick={onClose}
            className=" cursor-pointer text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-white/50 gap-4">
              <Loader2 className="animate-spin" size={32} />
              <p>Scanning local archives...</p>
            </div>
          ) : wallpapers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-white/30 gap-4">
              <ImageIcon size={48} className="opacity-20" />
              <p>No previous environments found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {wallpapers.map((url) => (
                <div
                  key={url}
                  onClick={() => onSelect(url)}
                  // aspect-video enforces the 16:9 ratio perfect for wallpapers
                  className={`relative aspect-video rounded-xl overflow-hidden group cursor-pointer border-2 transition-all duration-300 ${
                    url === currentWallpaper
                      ? 'border-accent shadow-[0_0_15px_rgba(var(--color-accent),0.4)]'
                      : 'border-white/5 hover:border-white/30'
                  }`}
                >
                  {isVideo(url) ? (
                    <>
                      <video
                        src={url}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        muted
                        loop
                        playsInline
                        onMouseEnter={(e) => e.currentTarget.play()}
                        onMouseLeave={(e) => e.currentTarget.pause()}
                      />
                      <div className="absolute top-2 left-2 text-white/70 drop-shadow-md">
                        <PlayCircle size={16} />
                      </div>
                    </>
                  ) : (
                    <img
                      src={url}
                      alt="Wallpaper"
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  )}

                  <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="text-white font-bold text-sm tracking-widest uppercase">
                      Set Active
                    </span>
                  </div>

                  {url === currentWallpaper && (
                    <div className="absolute top-2 right-2 bg-accent text-black text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-lg z-10">
                      Active
                    </div>
                  )}

                  {url !== currentWallpaper && (
                    <button
                      onClick={(e) => handleDelete(e, url)}
                      disabled={deletingId === url}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-danger text-white/50 hover:text-white rounded-lg transition-colors backdrop-blur-md opacity-0 group-hover:opacity-100 z-10"
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
