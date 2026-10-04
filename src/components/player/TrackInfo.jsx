import { AlertCircle, Music } from 'lucide-react';

export function TrackInfo({ title, artist, status, error }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-12 h-12 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center shrink-0 text-zinc-300 shadow-md shadow-black/20">
        <Music className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-zinc-100 truncate">
            {title || 'No track selected'}
          </span>
          {status && status !== 'idle' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/[0.08] text-zinc-300 font-mono uppercase tracking-wider border border-white/10">
              {status}
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-400 truncate">
          {artist || 'Select a song from your library'}
        </span>
        {error && (
          <span className="text-xs text-rose-400 flex items-center gap-1 mt-0.5 truncate">
            <AlertCircle className="w-3 h-3 shrink-0" />
            <span className="truncate">{error.message || 'Playback error'}</span>
          </span>
        )}
      </div>
    </div>
  );
}
