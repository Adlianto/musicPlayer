import { AlertCircle, Disc3, ShieldCheck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LibraryView } from './components/library/LibraryView.jsx';
import { PlayerBar } from './components/player/PlayerBar.jsx';
import { PlaybackProvider } from './context/PlaybackContext.jsx';
import { useLibrary } from './hooks/useLibrary.js';
import { usePlayer } from './hooks/usePlayer.js';

function MusicPlayerApp() {
  const {
    currentTrackId,
    isPlaying,
    loadTrack,
    play,
    pause,
    error: playbackError,
    clearError,
  } = usePlayer();

  const {
    tracks,
    allTracksCount,
    isLoading,
    error: libraryError,
    searchQuery,
    setSearchQuery,
    importFiles,
    updateTrack,
    deleteTrack,
    resolveTrackSource,
  } = useLibrary();

  const [activeTrack, setActiveTrack] = useState(null);
  const [playbackAlert, setPlaybackAlert] = useState(null);

  // Cari track yang saat ini aktif dari database tracks
  const currentActiveTrack = useMemo(() => {
    if (activeTrack) {
      const found = tracks.find((t) => t.trackId === activeTrack.trackId);
      if (found) return found;
    }
    if (currentTrackId) {
      return tracks.find((t) => t.trackId === currentTrackId) || activeTrack;
    }
    return activeTrack;
  }, [tracks, activeTrack, currentTrackId]);

  // Handler pemutaran track melalui alur resmi AudioPlayerService & FileSourceResolver
  const handlePlayTrack = async (track) => {
    try {
      setPlaybackAlert(null);
      clearError();

      // Selesaikan sumber fisik (resolusi File / FileHandle)
      const playableSource = await resolveTrackSource(track);
      setActiveTrack(track);

      // Muat lagu ke AudioPlayerService melalui hook usePlayer
      await loadTrack(track.trackId, playableSource);
      await play();
    } catch (err) {
      console.error('[App] Playback initiation failed:', err);
      setPlaybackAlert(
        err.message || 'Unable to play selected track. The file may be unavailable or moved.'
      );
      setTimeout(() => setPlaybackAlert(null), 6000);
    }
  };

  const handlePauseTrack = async () => {
    await pause();
  };

  // Navigasi Previous & Next antar lagu di pustaka
  const currentIndex = useMemo(() => {
    if (!currentActiveTrack) return -1;
    return tracks.findIndex((t) => t.trackId === currentActiveTrack.trackId);
  }, [tracks, currentActiveTrack]);

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex !== -1 && currentIndex < tracks.length - 1;

  const handlePreviousTrack = () => {
    if (hasPrevious) {
      handlePlayTrack(tracks[currentIndex - 1]);
    }
  };

  const handleNextTrack = () => {
    if (hasNext) {
      handlePlayTrack(tracks[currentIndex + 1]);
    }
  };

  const handleDeleteWithActiveSync = async (trackId) => {
    if (currentActiveTrack?.trackId === trackId) {
      await pause();
      setActiveTrack(null);
    }
    await deleteTrack(trackId);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-x-hidden antialiased">
      {/* Ambient Liquid Glass Backdrop Highlights */}
      <div className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-emerald-500/5 blur-[130px] rounded-full" />
      <div className="pointer-events-none fixed top-1/2 -right-40 w-[500px] h-[500px] bg-white/[0.02] blur-[150px] rounded-full" />

      {/* Top Application Header */}
      <header className="w-full border-b border-white/[0.08] bg-zinc-950/60 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-zinc-950 shadow-md shadow-emerald-500/20">
              <Disc3 className="w-5 h-5 animate-[spin_10s_linear_infinite]" />
            </div>
            <div>
              <span className="font-semibold text-sm tracking-tight text-white block">
                Aura Music
              </span>
              <span className="text-[10px] text-zinc-400 font-medium block">
                Local-First Audio Player
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-zinc-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Zero-Binary Duplication
            </span>
          </div>
        </div>
      </header>

      {/* Main Library View Area */}
      <main className="max-w-6xl mx-auto w-full px-6 pt-8 pb-36 flex-1 relative z-10">
        {/* Playback Alert Toast */}
        {(playbackAlert || playbackError) && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-center justify-between gap-3 backdrop-blur-xl animate-in fade-in duration-200 shadow-xl">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{playbackAlert || playbackError?.message}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setPlaybackAlert(null);
                clearError();
              }}
              className="p-1 rounded-lg hover:bg-white/10 text-rose-300 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <LibraryView
          tracks={tracks}
          allTracksCount={allTracksCount}
          isLoading={isLoading}
          error={libraryError}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onImportFiles={importFiles}
          onUpdateTrack={updateTrack}
          onDeleteTrack={handleDeleteWithActiveSync}
          activeTrackId={currentActiveTrack?.trackId}
          isPlaying={isPlaying}
          onPlayTrack={handlePlayTrack}
          onPauseTrack={handlePauseTrack}
        />
      </main>

      {/* Liquid Glass Bottom Player Bar */}
      <PlayerBar
        trackTitle={currentActiveTrack?.title}
        trackArtist={currentActiveTrack?.artist}
        onPrevious={handlePreviousTrack}
        onNext={handleNextTrack}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
      />
    </div>
  );
}

export default function App() {
  return (
    <PlaybackProvider>
      <MusicPlayerApp />
    </PlaybackProvider>
  );
}
