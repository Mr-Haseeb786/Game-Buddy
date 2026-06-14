import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Gamepad2, Image as ImageIcon, Check } from 'lucide-react'
import { GameEntry, GameStatus } from 'src/shared/types'
// import { GameEntry, GameStatus } from '../../shared/types' // Adjust path as needed

interface AddCustomGameModalProps {
  onClose: () => void
  onSave: (game: GameEntry) => void
}

export default function AddCustomGameModal({ onClose, onSave }: AddCustomGameModalProps) {
  const [title, setTitle] = useState('')
  const [status, setStatus] = useState<GameStatus>('planning')
  const [coverUrl, setCoverUrl] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    // Create a fake rawgId using the current timestamp to guarantee uniqueness
    const customId = Date.now()

    const newGame: GameEntry = {
      rawgId: customId,
      title: title.trim(),
      status: status,
      timePlayedMinutes: 0,
      savePathDesktop: null,
      updatedAt: Date.now(),
      saveExtension: null,
      cloudSaveId: null,
      background_image: coverUrl.trim() || null // Fails gracefully to the ImageIcon fallback in your card
    }

    onSave(newGame)
    onClose()
  }

  const modalContent = (
    <div className="fixed inset-0 w-screen h-screen z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/20 text-accent rounded-lg">
              <Gamepad2 size={20} />
            </div>
            <h2 className="text-xl font-bold text-white">Add Custom Game</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 bg-[#0f1115]">
          {/* Title Input */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Game Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Pokémon Emerald (Emulator)"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:bg-gray-800/80 transition-all placeholder:text-gray-600"
            />
          </div>

          {/* Status Select */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Current Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as GameStatus)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:bg-gray-800/80 transition-all cursor-pointer appearance-none"
            >
              <option value="playing">Playing</option>
              <option value="planned">Planned</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>

          {/* Cover Image (Optional) */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <ImageIcon size={14} /> Cover Image URL{' '}
              <span className="text-gray-600 font-normal capitalize tracking-normal">
                (Optional)
              </span>
            </label>
            <input
              type="url"
              value={coverUrl}
              onChange={(e) => setCoverUrl(e.target.value)}
              placeholder="https://example.com/cover.jpg"
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-accent focus:bg-gray-800/80 transition-all placeholder:text-gray-600"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 mt-2 border-t border-gray-800 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-accent hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg"
            >
              <Check size={16} /> Add to Library
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
