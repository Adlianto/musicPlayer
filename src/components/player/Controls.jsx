import { Loader2, Pause, Play, RotateCcw } from 'lucide-react';

export function Controls({ isPlaying, isLoading, onPlay, onPause, onReset }) {
  return (
    <div className="flex items-center gap-3">
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-800/60 rounded-full transition-colors"
          title="Ulangi dari awal"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      )}

      <button
        type="button"
        disabled={isLoading}
        onClick={isPlaying ? onPause : onPlay}
        className="w-11 h-11 rounded-full bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white flex items-center justify-center transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:pointer-events-none"
        title={isPlaying ? 'Jeda' : 'Putar'}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </button>
    </div>
  );
}
