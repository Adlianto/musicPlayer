import { AlertTriangle, CheckCircle2, Music, Pencil, Play, Trash2 } from 'lucide-react';
import { formatTime } from '../../utils/formatTime.js';

export function TrackRow({
  track,
  index,
  isActive,
  isPlaying,
  onPlay,
  onPause,
  onEdit,
  onDelete,
}) {
  const isAvailable = track.isAvailable === 1 || track.isAvailable === true;

  const handleRowClick = () => {
    if (!isAvailable) {
      onPlay(track);
      return;
    }
    if (isActive) {
      if (isPlaying) {
        onPause();
      } else {
        onPlay(track);
      }
    } else {
      onPlay(track);
    }
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group relative grid grid-cols-12 items-center px-4 py-3 rounded-xl transition-all cursor-pointer ${
        isActive
          ? 'bg-white/[0.08] border border-white/15 shadow-md shadow-black/20'
          : 'hover:bg-white/[0.04] border border-transparent hover:border-white/5'
      } ${!isAvailable ? 'opacity-70' : ''}`}
    >
      {/* Kolom 1: Index / Play Icon (cols 1) */}
      <div className="col-span-1 flex items-center justify-center text-xs font-mono text-zinc-400">
        <div className="relative w-7 h-7 flex items-center justify-center">
          {isActive ? (
            isPlaying ? (
              <div className="flex items-center gap-0.5 h-3.5">
                <span className="w-0.5 h-3.5 bg-emerald-400 animate-pulse" />
                <span className="w-0.5 h-2 bg-emerald-400 animate-pulse delay-75" />
                <span className="w-0.5 h-3 bg-emerald-400 animate-pulse delay-150" />
              </div>
            ) : (
              <Play className="w-3.5 h-3.5 text-zinc-200 fill-zinc-200" />
            )
          ) : (
            <>
              <span className="group-hover:hidden">{index + 1}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onPlay(track);
                }}
                className="hidden group-hover:flex w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 items-center justify-center text-zinc-100 transition-colors"
                title="Play"
              >
                <Play className="w-3 h-3 ml-0.5 fill-current" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Kolom 2: Title & Artist & Artwork (cols 5) */}
      <div className="col-span-5 flex items-center gap-3 min-w-0 pr-3">
        <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 text-zinc-300 shadow-inner">
          <Music className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex flex-col">
          <span
            className={`text-sm font-medium truncate ${
              isActive ? 'text-emerald-400' : 'text-zinc-100'
            }`}
          >
            {track.title || 'Untitled Track'}
          </span>
          <span className="text-xs text-zinc-400 truncate">
            {track.artist || 'Unknown Artist'}
          </span>
        </div>
      </div>

      {/* Kolom 3: Album (cols 3) */}
      <div className="col-span-3 text-xs text-zinc-400 truncate pr-3">
        {track.album || '—'}
      </div>

      {/* Kolom 4: Duration & Status (cols 2) */}
      <div className="col-span-2 flex items-center gap-2">
        <span className="text-xs font-mono text-zinc-400">
          {formatTime(track.duration || 0)}
        </span>
        {isAvailable ? (
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
            <CheckCircle2 className="w-2.5 h-2.5" />
            Ready
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium"
            title="Session expired or file missing. Re-import to play."
          >
            <AlertTriangle className="w-2.5 h-2.5" />
            Unavailable
          </span>
        )}
      </div>

      {/* Kolom 5: Actions (cols 1) */}
      <div
        className="col-span-1 flex items-center justify-end relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onEdit(track)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/10 transition-colors"
            title="Edit Metadata"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(track)}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Remove from Library"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
