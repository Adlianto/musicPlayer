import { Clock, SearchX } from 'lucide-react';
import { TrackRow } from './TrackRow.jsx';

export function TrackList({
  tracks,
  activeTrackId,
  isPlaying,
  searchQuery,
  onPlay,
  onPause,
  onEdit,
  onDelete,
}) {
  if (tracks.length === 0 && searchQuery) {
    return (
      <div className="w-full py-16 text-center rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md flex flex-col items-center justify-center">
        <SearchX className="w-10 h-10 text-zinc-500 mb-3" />
        <h4 className="text-sm font-medium text-zinc-300">No tracks found</h4>
        <p className="text-xs text-zinc-500 mt-1">
          No songs matched &quot;{searchQuery}&quot;. Try searching for something else.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col space-y-1">
      {/* Table Header */}
      <div className="grid grid-cols-12 px-4 py-2 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase border-b border-white/5 mb-1">
        <span className="col-span-1 text-center">#</span>
        <span className="col-span-5">Title & Artist</span>
        <span className="col-span-3">Album</span>
        <span className="col-span-2 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>Duration</span>
        </span>
        <span className="col-span-1 text-right">Actions</span>
      </div>

      {/* Rows */}
      <div className="space-y-1">
        {tracks.map((track, idx) => (
          <TrackRow
            key={track.trackId}
            track={track}
            index={idx}
            isActive={track.trackId === activeTrackId}
            isPlaying={isPlaying && track.trackId === activeTrackId}
            onPlay={onPlay}
            onPause={onPause}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}
