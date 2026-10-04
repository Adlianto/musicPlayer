import { usePlayer } from '../../hooks/usePlayer.js';
import { Controls } from './Controls.jsx';
import { ProgressSeek } from './ProgressSeek.jsx';
import { TrackInfo } from './TrackInfo.jsx';
import { VolumeControl } from './VolumeControl.jsx';

export function PlayerBar({ trackTitle, trackArtist }) {
  const {
    isPlaying,
    isLoading,
    status,
    currentTime,
    duration,
    volume,
    error,
    play,
    pause,
    seek,
    setVolume,
  } = usePlayer();

  return (
    <footer className="w-full bg-gray-950/80 backdrop-blur-md border-t border-gray-800/80 px-4 py-3 fixed bottom-0 left-0 z-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Kolom Kiri: Metadata lagu */}
        <div className="w-full md:w-1/4">
          <TrackInfo
            title={trackTitle}
            artist={trackArtist}
            status={status}
            error={error}
          />
        </div>

        {/* Kolom Tengah: Kontrol playback & seekbar */}
        <div className="w-full md:w-2/4 flex flex-col items-center gap-2">
          <Controls
            isPlaying={isPlaying}
            isLoading={isLoading}
            onPlay={play}
            onPause={pause}
            onReset={() => seek(0)}
          />
          <ProgressSeek
            currentTime={currentTime}
            duration={duration}
            onSeek={seek}
          />
        </div>

        {/* Kolom Kanan: Pengatur volume */}
        <div className="w-full md:w-1/4 flex justify-end">
          <VolumeControl
            volume={volume}
            onVolumeChange={setVolume}
          />
        </div>
      </div>
    </footer>
  );
}
