import { useEffect, useRef, useState } from 'react';
import { usePlayer } from './usePlayer.js';

/**
 * useVisualizer.js
 * Custom hook untuk mengonsumsi AudioVisualizerSource (Section 1.4 draftv1.md).
 * Mengelola loop animasi requestAnimationFrame dan pembaruan data spektrum frekuensi serta waveform.
 *
 * @param {Object} [options]
 * @param {number} [options.fftBins=64] - Jumlah bin FFT (default: 64)
 * @param {React.RefObject<HTMLCanvasElement>} [options.canvasRef] - Ref canvas opsional untuk direct 60 FPS canvas painting
 * @returns {{
 *   frequencyData: Uint8Array,
 *   waveformData: Uint8Array,
 *   isAvailable: boolean,
 *   isPlaying: boolean
 * }}
 */
export function useVisualizer({ fftBins = 64, canvasRef = null } = {}) {
  const { isPlaying, getVisualizerSource } = usePlayer();

  const source = typeof getVisualizerSource === 'function' ? getVisualizerSource() : null;
  const isAvailable = Boolean(
    source && typeof source.isAvailable === 'function' && source.isAvailable()
  );

  const freqRef = useRef(new Uint8Array(fftBins));
  const waveRef = useRef(new Uint8Array(fftBins));

  const [frequencyData, setFrequencyData] = useState(() => new Uint8Array(fftBins));
  const [waveformData, setWaveformData] = useState(() => new Uint8Array(fftBins));

  useEffect(() => {
    if (!isAvailable || !source) {
      return;
    }

    let animationId = null;

    const render = () => {
      source.getFrequencyData(freqRef.current);
      source.getWaveformData(waveRef.current);

      // Jika ada canvasRef, gambar langsung di canvas untuk performa maksimal tanpa React re-render overhead
      if (canvasRef?.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const width = canvas.width;
          const height = canvas.height;

          ctx.clearRect(0, 0, width, height);

          const barCount = freqRef.current.length;
          const barSpacing = 3;
          const totalSpacing = (barCount - 1) * barSpacing;
          const barWidth = Math.max(2, (width - totalSpacing) / barCount);

          for (let i = 0; i < barCount; i++) {
            const rawVal = isPlaying ? freqRef.current[i] : 6;
            const percent = rawVal / 255;
            const barHeight = Math.max(4, percent * (height - 6));
            const x = i * (barWidth + barSpacing);
            const y = height - barHeight;

            // Gradient modern: cyan -> indigo -> violet
            const gradient = ctx.createLinearGradient(0, height, 0, y);
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)'); // indigo-500
            gradient.addColorStop(0.5, 'rgba(129, 140, 248, 0.8)'); // indigo-400
            gradient.addColorStop(1, 'rgba(192, 132, 252, 1)'); // purple-400

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
            ctx.fill();
          }
        }
      } else {
        // Fallback update state jika komponen tidak menggunakan canvasRef
        setFrequencyData(new Uint8Array(freqRef.current));
        setWaveformData(new Uint8Array(waveRef.current));
      }

      if (isPlaying) {
        animationId = requestAnimationFrame(render);
      }
    };

    // Render 1 frame awal untuk menampilkan idle bars
    render();

    if (isPlaying) {
      animationId = requestAnimationFrame(render);
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isPlaying, isAvailable, source, canvasRef]);

  return {
    frequencyData,
    waveformData,
    isAvailable,
    isPlaying,
  };
}
