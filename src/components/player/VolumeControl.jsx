import { Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';
import { gainToSlider, sliderToGain } from '../../utils/audioMath.js';

/**
 * VolumeControl.jsx
 * Pengatur volume dengan kurva eksponensial kuadratik (ISSUE-01):
 * gain = Math.pow(sliderValue, 2)
 */
export function VolumeControl({ volume, onVolumeChange }) {
  const [prevVolume, setPrevVolume] = useState(volume > 0 ? volume : 1.0);

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      onVolumeChange(0);
    } else {
      onVolumeChange(prevVolume > 0 ? prevVolume : 1.0);
    }
  };

  const handleSliderChange = (e) => {
    const sliderVal = parseFloat(e.target.value);
    if (Number.isFinite(sliderVal)) {
      const exponentialGain = sliderToGain(sliderVal);
      onVolumeChange(exponentialGain);
    }
  };

  const isMuted = volume <= 0;
  const sliderPosition = gainToSlider(volume);

  return (
    <div className="flex items-center gap-2 w-32 shrink-0">
      <button
        type="button"
        onClick={toggleMute}
        className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-full transition-colors"
        title={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
      </button>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={sliderPosition}
        onChange={handleSliderChange}
        className="w-full h-1.5 bg-white/15 rounded-lg appearance-none cursor-pointer accent-white"
        style={{
          background: `linear-gradient(to right, rgba(255,255,255,0.9) ${sliderPosition * 100}%, rgba(255,255,255,0.12) ${sliderPosition * 100}%)`,
        }}
      />
    </div>
  );
}
