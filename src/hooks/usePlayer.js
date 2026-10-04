import { useContext } from 'react';
import { PlaybackContext } from '../context/PlaybackContext.js';

/**
 * usePlayer.js
 * Hook adapter untuk mengonsumsi PlaybackContext di komponen UI React.
 */
export function usePlayer() {
  const context = useContext(PlaybackContext);
  if (!context) {
    throw new Error('usePlayer must be used within a PlaybackProvider');
  }
  return context;
}
