import { Pencil, X } from 'lucide-react';
import { useState } from 'react';

export function EditTrackModal({ track, isOpen, onClose, onSave }) {
  const [title, setTitle] = useState(track?.title || '');
  const [artist, setArtist] = useState(track?.artist || '');
  const [album, setAlbum] = useState(track?.album || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen || !track) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setIsSaving(true);
      await onSave(track.trackId, {
        title: title.trim(),
        artist: artist.trim(),
        album: album.trim(),
      });
      onClose();
    } catch (err) {
      console.error('Failed to update track:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-2xl bg-zinc-900/90 border border-white/15 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2 text-zinc-100">
            <Pencil className="w-4 h-4 text-emerald-400" />
            <h3 className="text-base font-semibold">Edit Track Details</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-zinc-400 mt-2 mb-4">
          Changes will only update your library metadata. Your original audio file remains untouched.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 focus:border-emerald-400/50 text-zinc-100 text-sm outline-none transition-colors"
              placeholder="Track Title"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Artist</label>
            <input
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 focus:border-emerald-400/50 text-zinc-100 text-sm outline-none transition-colors"
              placeholder="Artist Name"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1">Album</label>
            <input
              type="text"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white/[0.06] border border-white/10 focus:border-emerald-400/50 text-zinc-100 text-sm outline-none transition-colors"
              placeholder="Album Name"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-300 hover:text-zinc-100 hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="px-5 py-2 rounded-xl text-sm font-medium bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
