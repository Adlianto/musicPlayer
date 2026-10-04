import { AlertTriangle, Trash2, X } from 'lucide-react';
import { useState } from 'react';

export function DeleteConfirmModal({ track, isOpen, onClose, onConfirm }) {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !track) return null;

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onConfirm(track.trackId);
      onClose();
    } catch (err) {
      console.error('Failed to delete track:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-zinc-900/90 border border-white/15 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-rose-400">
            <Trash2 className="w-5 h-5" />
            <h3 className="text-base font-semibold text-zinc-100">Remove from Library?</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4 space-y-3">
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
            <p className="text-sm font-medium text-zinc-100 truncate">{track.title}</p>
            <p className="text-xs text-zinc-400 truncate">{track.artist || 'Unknown Artist'}</p>
          </div>

          <div className="flex items-start gap-2 text-xs text-zinc-400">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              This will remove the track from your music player library. Your original audio file on
              your computer will <strong className="text-zinc-200">NOT</strong> be deleted or
              modified.
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-5 py-2 rounded-xl text-sm font-medium bg-rose-600 hover:bg-rose-500 active:scale-95 text-white transition-all shadow-lg shadow-rose-600/30 disabled:opacity-50"
          >
            {isDeleting ? 'Removing...' : 'Remove Track'}
          </button>
        </div>
      </div>
    </div>
  );
}
