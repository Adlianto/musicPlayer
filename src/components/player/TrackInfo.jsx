import { AlertCircle, Music } from 'lucide-react';

export function TrackInfo({ title, artist, status, error }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-12 h-12 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center shrink-0 text-indigo-400 shadow-inner">
        <Music className="w-6 h-6" />
      </div>
      <div className="min-w-0 flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-100 truncate">
            {title || 'Belum ada lagu yang dimuat'}
          </span>
          {status && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-900/60 text-indigo-300 font-mono uppercase">
              {status}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400 truncate">
          {artist || 'Pilih atau muat berkas audio untuk memulai'}
        </span>
        {error && (
          <span className="text-xs text-red-400 flex items-center gap-1 mt-0.5">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {error.message || 'Terjadi kesalahan'}
          </span>
        )}
      </div>
    </div>
  );
}
