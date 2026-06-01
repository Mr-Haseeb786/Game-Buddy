import { useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import Cropper from 'react-easy-crop'
import { X, Check, Loader2, Crop } from 'lucide-react'

interface WallpaperCropperModalProps {
  imageSrc: string
  onClose: () => void
  onComplete: (localUrl: string) => void
}

interface Area {
  x: number
  y: number
  width: number
  height: number
}

export default function WallpaperCropperModal({
  imageSrc,
  onClose,
  onComplete
}: WallpaperCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isProcessing, setIsProcessing] = useState(false)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  // Embedded Canvas Extractor
  const extractCroppedImage = async (): Promise<string | null> => {
    if (!croppedAreaPixels) return null

    // --- THE BULLETPROOF BYPASS ---
    // Ask the backend for the raw Base64 string to avoid cross-origin tainting
    const base64DataUrl = await window.api.readImageBase64(imageSrc)
    if (!base64DataUrl) throw new Error('Failed to load image data')

    const image = new Image()
    image.src = base64DataUrl // Feed the Base64 string instead of the local:// URL

    await new Promise((resolve) => (image.onload = resolve))

    const canvas = document.createElement('canvas')
    canvas.width = croppedAreaPixels.width
    canvas.height = croppedAreaPixels.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    )

    // This will now execute perfectly without throwing a SecurityError!
    return canvas.toDataURL('image/jpeg', 0.95)
  }

  const handleSave = async () => {
    setIsProcessing(true)
    const base64Data = await extractCroppedImage()
    if (base64Data) {
      const localUrl = await window.api.saveCroppedWallpaper(base64Data)
      if (localUrl) onComplete(localUrl)
    }
    setIsProcessing(false)
  }

  const modalContent = (
    <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-8 pointer-events-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-5xl h-[80vh] flex flex-col bg-[#0a0a0a] rounded-3xl border border-white/10 shadow-2xl overflow-hidden relative"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 bg-white/5 shrink-0 z-10">
          <h3 className="text-white font-bold flex items-center gap-2">
            <Crop className="text-accent" size={20} /> Frame Environment
          </h3>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cropper Container */}
        <div className="flex-1 relative bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={16 / 9} // Locked to 16:9 Widescreen
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            objectFit="contain"
          />
        </div>

        {/* Footer Controls */}
        <div className="h-20 flex items-center justify-between px-8 border-t border-white/10 bg-[#121212] shrink-0 z-10">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <span className="text-sm font-bold text-white/50 w-12">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-accent bg-white/10 rounded-lg h-2 appearance-none outline-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={isProcessing}
            className="px-8 py-3 rounded-xl bg-accent text-primary font-black tracking-wide flex items-center gap-3 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          >
            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
            {isProcessing ? 'Processing...' : 'Apply Wallpaper'}
          </button>
        </div>
      </motion.div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
