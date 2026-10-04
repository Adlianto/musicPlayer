import { Activity, BarChart2, Radio } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useVisualizer } from '../../hooks/useVisualizer.js';

/**
 * VisualizerCanvas.jsx
 * Komponen visualisasi spektrum audio real-time (Section 1.4 draftv1.md).
 * Menggunakan AudioVisualizerSource dari WebAudioPlayerAdapter via useVisualizer hook.
 */
export function VisualizerCanvas({ className = '' }) {
  const canvasRef = useRef(null);
  const { isAvailable, isPlaying } = useVisualizer({
    fftBins: 48,
    canvasRef,
  });

  // Handle responsive canvas resolution (retina / high-DPI scaling)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return (
    <div
      className={`rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 flex flex-col gap-4 backdrop-blur-md shadow-xl ${className}`}
    >
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              Audio Spectrum Visualizer
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-medium border border-indigo-500/30">
                Section 1.4
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Kapabilitas opsional via <code className="text-indigo-300 font-mono">AudioVisualizerSource</code> (Web Audio AnalyserNode)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAvailable ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-600'}`} />
              {isPlaying ? 'Live Spectrum' : 'Ready (Idle)'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
              <Radio className="w-3 h-3 text-slate-500" />
              Unsupported on Native
            </span>
          )}
        </div>
      </div>

      {isAvailable ? (
        <div className="relative w-full h-28 bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800/60 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            style={{ width: '100%', height: '100%' }}
          />
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 backdrop-blur-[1px] pointer-events-none">
              <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-600" />
                Pemutaran dijeda — Tekan Play untuk mengamati frekuensi
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full h-28 bg-slate-950/40 rounded-xl border border-dashed border-slate-800 flex flex-col items-center justify-center p-4 text-center">
          <Radio className="w-6 h-6 text-slate-600 mb-1" />
          <p className="text-xs text-slate-400 font-medium">
            Visualizer dinonaktifkan pada Android Native (Section 1.4)
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-md">
            Native ExoPlayer berjalan di luar JavaScript thread untuk menjaga efisiensi baterai dan menghindari overhead bridge antar-proses.
          </p>
        </div>
      )}
    </div>
  );
}
