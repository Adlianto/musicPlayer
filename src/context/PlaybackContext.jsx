import { useEffect, useMemo, useState } from 'react';
import { audioPlayerService } from '../services/audio/AudioPlayerService.js';
import { PLAYBACK_STATUS } from '../types/playerConstants.js';
import { PlaybackContext } from './PlaybackContext.js';

export function PlaybackProvider({ children, playerService = audioPlayerService }) {
  const [snapshot, setSnapshot] = useState(() => playerService.getSnapshot());
  const [error, setError] = useState(null);
  const [disruptionReason, setDisruptionReason] = useState(null);

  useEffect(() => {
    playerService.init().catch((err) => {
      console.error('[PlaybackProvider] Failed to init audio service:', err);
    });

    const unsubscribeState = playerService.on('stateChange', (_status, nextSnapshot) => {
      setSnapshot({ ...nextSnapshot });
      if (nextSnapshot.status !== PLAYBACK_STATUS.ERROR) {
        setError(null);
      }
    });

    const unsubscribeProgress = playerService.on('progress', (currentTime, duration, bufferedTime) => {
      setSnapshot((prev) => ({
        ...prev,
        currentTime,
        duration,
        bufferedTime,
      }));
    });

    const unsubscribeError = playerService.on('error', (err) => {
      setError(err);
    });

    const unsubscribeDisruption = playerService.on('disruption', (reason) => {
      setDisruptionReason(reason);
    });

    return () => {
      unsubscribeState();
      unsubscribeProgress();
      unsubscribeError();
      unsubscribeDisruption();
    };
  }, [playerService]);

  const value = useMemo(() => {
    return {
      snapshot,
      status: snapshot.status,
      currentTrackId: snapshot.currentTrackId,
      currentTime: snapshot.currentTime,
      duration: snapshot.duration,
      bufferedTime: snapshot.bufferedTime,
      volume: snapshot.volume,
      isMuted: snapshot.isMuted,
      playbackRate: snapshot.playbackRate,
      isPlaying: snapshot.status === PLAYBACK_STATUS.PLAYING,
      isLoading: snapshot.status === PLAYBACK_STATUS.LOADING,
      isPaused: snapshot.status === PLAYBACK_STATUS.PAUSED,
      error,
      disruptionReason,
      clearError: () => setError(null),
      clearDisruption: () => setDisruptionReason(null),

      // Dispatch actions
      play: () => playerService.play(),
      pause: () => playerService.pause(),
      seek: (time) => playerService.seek(time),
      setVolume: (volume) => playerService.setVolume(volume),
      setPlaybackRate: (rate) => playerService.setPlaybackRate(rate),
      loadTrack: (trackId, source) => playerService.loadTrack(trackId, source),
      getVisualizerSource: () => playerService.getVisualizerSource(),
    };
  }, [snapshot, error, disruptionReason, playerService]);

  return (
    <PlaybackContext.Provider value={value}>
      {children}
    </PlaybackContext.Provider>
  );
}

export { PlaybackContext };
