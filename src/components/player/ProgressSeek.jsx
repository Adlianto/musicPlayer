import { formatTime } from '../../utils/formatTime.js';

export function ProgressSeek({ currentTime, duration, onSeek }) {
  const percentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleChange = (e) => {
    const nextTime = parseFloat(e.target.value);
    if (Number.isFinite(nextTime) && onSeek) {
      onSeek(nextTime);
    }
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <span className="text-xs text-gray-400 font-mono w-10 text-right select-none">
        {formatTime(currentTime)}
      </span>
      <div className="relative flex-1 flex items-center group">
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={currentTime || 0}
          onChange={handleChange}
          disabled={!duration || duration <= 0}
          className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:h-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, #6366f1 ${percentage}%, #1f2937 ${percentage}%)`,
          }}
        />
      </div>
      <span className="text-xs text-gray-400 font-mono w-10 text-left select-none">
        {formatTime(duration)}
      </span>
    </div>
  );
}
