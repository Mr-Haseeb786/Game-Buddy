import { useState } from 'react'
import { GameEntry, GameStatus } from '../../../shared/types'
import { X, FolderOpen, Trash2, AlertTriangle } from 'lucide-react'

interface ManageGameModalProps {
  game: GameEntry
  onClose: () => void
  onUpdate: (updatedGame: GameEntry) => void
  onRemove: (rawgId: number, deleteFromCloud: boolean) => void
}

export function ManageGameModal({ game, onClose, onUpdate, onRemove }: ManageGameModalProps) {
  const [status, setStatus] = useState<GameStatus>(game.status)
  const [playtime, setPlaytime] = useState<number>(game.timePlayedMinutes)
  const [savePath, setSavePath] = useState<string | null>(game.savePathDesktop)
  const [showDeleteWarning, setShowDeleteWarning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

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
      <div className="bg-[#1a1f2e] rounded-lg shadow-xl w-full max-w-md flex flex-col max-h-[90vh] border border-gray-700">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#1a1f2e] rounded-t-lg shrink-0">
          <h2 className="text-xl font-bold text-white truncate pr-4">{game.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
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

        {/* Footer / Danger Zone */}
        <div className="p-6 border-t border-gray-800 bg-gray-900 rounded-b-lg shrink-0">
          {showDeleteWarning ? (
            <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
              <h4 className="text-red-400 font-bold flex items-center gap-2 mb-2">
                <AlertTriangle size={18} /> Danger Zone
              </h4>
              <p className="text-sm text-gray-300 mb-4">
                You are about to remove <strong className="text-white">{game.title}</strong> from
                your tracked library.
                {game.cloudSaveId && (
                  <span className="block mt-1 text-red-300">
                    This game currently has a backed-up save file in your Google Drive.
                  </span>
                )}
              </p>

              <div className="flex flex-col gap-2">
                {/* Option 1: Safe Removal */}
                <button
                  onClick={() => {
                    setIsProcessing(true)
                    onRemove(game.rawgId, false)
                  }}
                  disabled={isProcessing}
                  className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white rounded font-medium transition-colors text-sm border border-gray-700 disabled:opacity-50"
                >
                  Remove from Local Library Only (Keep Cloud Save)
                </button>

                {/* Option 2: Destructive Removal (Only show if cloud save exists) */}
                {game.cloudSaveId && (
                  <button
                    onClick={() => {
                      setIsProcessing(true)
                      onRemove(game.rawgId, true)
                    }}
                    disabled={isProcessing}
                    className="w-full py-2 bg-red-600 hover:bg-red-500 text-white rounded font-medium transition-colors text-sm flex justify-center items-center gap-2 shadow-lg disabled:opacity-50"
                  >
                    <Trash2 size={16} /> Delete Local Entry & Cloud Save
                  </button>
                )}

                {/* Cancel */}
                <button
                  onClick={() => setShowDeleteWarning(false)}
                  disabled={isProcessing}
                  className="w-full py-2 text-gray-500 hover:text-white transition-colors text-sm mt-2 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <button
                onClick={() => setShowDeleteWarning(true)}
                className="text-sm font-medium text-red-500 hover:text-red-400 transition-colors"
              >
                Remove Game
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
