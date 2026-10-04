import { Loader2, Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

export function Controls({
  isPlaying,
  isLoading,
  onPlay,
  onPause,
  onReset,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
}) {
  return (
    <div className="flex items-center gap-3">
      {onPrevious && (
        <button
          type="button"
          onClick={onPrevious}
          disabled={!hasPrevious}
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-full transition-colors disabled:opacity-30 disabled:pointer-events-none"
          title="Previous"
        >
          <SkipBack className="w-4 h-4" />
        </button>
      )}

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-full transition-colors"
          title="Replay from start"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      )}

      <button
        type="button"
        disabled={isLoading}
        onClick={isPlaying ? onPause : onPlay}
        className="w-11 h-11 rounded-full bg-white hover:bg-zinc-200 active:scale-95 text-zinc-950 flex items-center justify-center transition-all shadow-lg shadow-white/10 disabled:opacity-50 disabled:pointer-events-none"
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-zinc-950" />
        ) : isPlaying ? (
          <Pause className="w-5 h-5 fill-current" />
        ) : (
          <Play className="w-5 h-5 ml-0.5 fill-current" />
        )}
      </button>

      {onNext && (
        <button
          type="button"
          onClick={onNext}
          disabled={!hasNext}
          className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-full transition-colors disabled:opacity-30 disabled:pointer-events-none"
          title="Next"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
