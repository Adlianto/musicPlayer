import {
  Activity,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileAudio,
  FolderOpen,
  Music,
  Radio,
  Volume2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { PlayerBar } from './components/player/PlayerBar.jsx';
import { VisualizerCanvas } from './components/player/VisualizerCanvas.jsx';
import { PlaybackProvider } from './context/PlaybackContext.jsx';
import { usePlatform } from './hooks/usePlatform.js';
import { usePlayer } from './hooks/usePlayer.js';
import { createSourceDescriptor } from './types/trackSource.js';
import { formatTime } from './utils/formatTime.js';

function MusicPlayerApp() {
  const {
    status,
    currentTrackId,
    currentTime,
    duration,
    volume,
    isPlaying,
    loadTrack,
    play,
    error,
    disruptionReason,
    clearError,
    clearDisruption,
  } = usePlayer();

  const [activeMeta, setActiveMeta] = useState({
    title: '',
    artist: '',
  });

  // Handler untuk memuat audio sampel bawaan
  const handleLoadSample = async () => {
    const descriptor = createSourceDescriptor(
      'web_session_file',
      '/sample-audio/sample.wav',
      'Sample Sine Tone A4 (440Hz)',
      176444,
      Date.now()
    );

    setActiveMeta({
      title: 'Sample Sine Tone A4 (440Hz)',
      artist: 'Synthesized Test Generator',
    });

    await loadTrack('track-sample-sine-a4', descriptor);
    await play();
  };

  // Handler untuk memilih file audio lokal dari komputer user
  const handleLocalFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const trackId = `track-local-${Date.now()}`;
    const descriptor = createSourceDescriptor(
      'web_session_file',
      file.name,
      file.name,
      file.size,
      file.lastModified
    );

    // Menyertakan file instance untuk resolusi Object URL oleh WebAudioPlayerAdapter
    descriptor.fileInstance = file;

    setActiveMeta({
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Local Audio File',
    });

    await loadTrack(trackId, descriptor);
    await play();
  };

  // Uji Pergantian Lagu Cepat (Rapid Track Switching Test untuk Concurrency Guard)
  const handleRapidSwitchTest = async () => {
    const descA = createSourceDescriptor('web_session_file', '/sample-audio/sample.wav', 'Track Test Alpha');
    const descB = createSourceDescriptor('web_session_file', '/sample-audio/sample.wav', 'Track Test Beta (Final)');

    setActiveMeta({ title: 'Track Test Beta (Final)', artist: 'Concurrency Test' });

    // Memanggil loadTrack A lalu seketika memanggil loadTrack B
    loadTrack('test-alpha', descA);
    loadTrack('test-beta', descB);
    play();
  };

  // Uji Taksonomi Error (Section 1.3 & 5.3: SOURCE_NOT_FOUND)
  const handleSimulateError = async () => {
    const invalidDescriptor = createSourceDescriptor('web_session_file', '', 'Missing File.mp3');
    setActiveMeta({ title: 'Simulated Missing File', artist: 'Error Taxonomy Test' });
    await loadTrack('invalid-track-id', invalidDescriptor);
  };

  const platform = usePlatform();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pb-28">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-600/10">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Music Player
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-medium uppercase font-mono">
                  {platform.platform}
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Source of Truth: <strong className="text-indigo-400 uppercase">{platform.authoritativeSource}</strong> ({platform.supportsBackgroundPlayback} background)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/20">
              <FolderOpen className="w-4 h-4" />
              <span>Buka File Lokal</span>
              <input
                type="file"
                accept="audio/*"
                onChange={handleLocalFileSelect}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 flex flex-col gap-6">
        {/* Banner Status Arsitektur */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Unidirectional Flow</h2>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                UI &rarr; PlaybackContext &rarr; AudioPlayerService &rarr; Adapter.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Playback State</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-semibold uppercase">
                  {status}
                </span>
                {isPlaying && <span className="text-xs text-emerald-400 font-medium">● Audio Berjalan</span>}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Concurrency Guard</h2>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                OperationManager mencegah kondisi balapan saat pemutaran diganti cepat.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Lifecycle Sync</h2>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Source of Truth: <span className="text-amber-300 font-mono font-semibold">{platform.authoritativeSource}</span>. Reconnection Protocol siap.
              </p>
            </div>
          </div>
        </div>

        {/* Notifikasi Disruption (jika ada interupsi audio sistem) */}
        {disruptionReason && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-amber-200 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Interupsi Audio:</strong> Terjadi event <code className="bg-amber-950/60 px-1.5 py-0.5 rounded font-mono text-amber-300">{disruptionReason}</code>. Pemutaran dijeda oleh sistem.
              </span>
            </div>
            <button
              type="button"
              onClick={clearDisruption}
              className="p-1 rounded hover:bg-amber-500/20 text-amber-400 hover:text-amber-200 transition-colors"
              title="Tutup notifikasi"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Notifikasi Error Terstandarisasi (Section 1.3 & 5.3) */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-3 text-rose-200 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <span className="font-semibold text-rose-300 mr-2">
                  [{error.code || 'ERROR'}]
                </span>
                <span>{error.message || 'Terjadi kesalahan pemutaran audio'}</span>
                <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-950/60 border border-rose-800/40 text-rose-300">
                  {error.isRecoverable ? 'Dapat Dipulihkan' : 'Kritis'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={clearError}
              className="p-1 rounded hover:bg-rose-500/20 text-rose-400 hover:text-rose-200 transition-colors"
              title="Abaikan error"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Audio Spectrum Visualizer (Section 1.4) */}
        <VisualizerCanvas />

        {/* Panel Interaktif Uji Alur Perintah Playback */}
        <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm flex flex-col gap-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800/60">
            <div>
              <h3 className="text-base font-bold text-white">Panel Verifikasi Alur Playback & Kontrak Interface</h3>
              <p className="text-xs text-slate-400 mt-1">
                Uji langsung pemutaran audio, perlindungan konkurensi, dan taksonomi error standar (Section 1.3).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleLoadSample}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors border border-slate-700/60"
              >
                <FileAudio className="w-4 h-4 text-indigo-400" />
                <span>Putar Audio Sampel (Sine 440Hz)</span>
              </button>

              <button
                type="button"
                onClick={handleRapidSwitchTest}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors border border-slate-700/60"
                title="Memanggil loadTrack A lalu seketika B untuk menguji penolakan request basi"
              >
                <Activity className="w-4 h-4 text-violet-400" />
                <span>Uji Rapid Switch (Guard)</span>
              </button>

              <button
                type="button"
                onClick={handleSimulateError}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/40 text-xs font-medium text-rose-300 transition-colors border border-rose-800/50"
                title="Memuat deskriptor file tidak valid untuk menguji taksonomi SOURCE_NOT_FOUND"
              >
                <AlertCircle className="w-4 h-4 text-rose-400" />
                <span>Uji Error (SOURCE_NOT_FOUND)</span>
              </button>
            </div>
          </div>

          {/* Telemetri Status State Snapshot */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/50 font-mono text-xs">
            <div>
              <span className="text-slate-500 block">CURRENT_TRACK_ID</span>
              <span className="text-slate-200 font-semibold truncate block mt-0.5">
                {currentTrackId || 'null'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">PLAYBACK_STATUS</span>
              <span className="text-indigo-400 font-bold block mt-0.5 uppercase">
                {status}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">TIME_PROGRESS</span>
              <span className="text-slate-200 block mt-0.5">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">VOLUME</span>
              <span className="text-slate-200 block mt-0.5 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Floating Bottom Player Bar */}
      <PlayerBar
        trackTitle={activeMeta.title}
        trackArtist={activeMeta.artist}
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
