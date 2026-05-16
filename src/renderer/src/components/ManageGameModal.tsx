import { useState } from 'react'
import { GameEntry, GameStatus } from '../../../shared/types'
import { X, FolderOpen, Trash2, Save } from 'lucide-react'

interface ManageGameModalProps {
  game: GameEntry
  onClose: () => void
  onUpdate: (updatedGame: GameEntry) => void
  onRemove: (rawgId: number) => void
}

export function ManageGameModal({ game, onClose, onUpdate, onRemove }: ManageGameModalProps) {
  const [status, setStatus] = useState<GameStatus>(game.status)
  const [playtime, setPlaytime] = useState<number>(game.timePlayedMinutes)
  const [savePath, setSavePath] = useState<string | null>(game.savePathDesktop)

  const handleSelectFolder = async () => {
    const folder = await window.api.selectFolder()
    if (folder) setSavePath(folder)
  }

  const handleSave = () => {
    onUpdate({
      ...game,
      status,
      timePlayedMinutes: playtime,
      savePathDesktop: savePath
    })
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 border border-gray-700 rounded-lg w-full max-w-md overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900">
          <h2 className="text-xl font-bold text-white truncate pr-4">{game.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Status Select */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Play Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as GameStatus)}
              className="w-full bg-gray-900 text-white border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500 capitalize"
            >
              <option value="playing">Playing</option>
              <option value="planning">Planning</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
            </select>
          </div>

          {/* Playtime */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Playtime (Minutes)
            </label>
            <input
              type="number"
              value={playtime}
              onChange={(e) => setPlaytime(parseInt(e.target.value) || 0)}
              className="w-full bg-gray-900 text-white border border-gray-700 rounded p-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Save Path Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Local Save File Path
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={savePath || 'Not mapped...'}
                className="flex-1 bg-gray-900 text-gray-400 border border-gray-700 rounded p-2 text-sm truncate"
              />
              <button
                onClick={handleSelectFolder}
                className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded flex items-center transition-colors"
                title="Browse Folders"
              >
                <FolderOpen size={18} />
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Map this so we can sync it to Google Drive later.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-700 bg-gray-900 flex justify-between">
          <button
            onClick={() => onRemove(game.rawgId)}
            className="text-red-400 hover:bg-red-900/30 px-3 py-2 rounded flex items-center gap-2 transition-colors text-sm font-medium"
          >
            <Trash2 size={16} /> Remove Game
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-gray-300 hover:bg-gray-800 px-4 py-2 rounded transition-colors text-sm font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded flex items-center gap-2 transition-colors text-sm font-medium"
            >
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
