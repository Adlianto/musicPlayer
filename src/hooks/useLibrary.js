/**
 * useLibrary.js
 * React Hook untuk mengakses dan memanipulasi Pustaka Musik (Library) secara reaktif.
 * Menyediakan daftar track, pencarian lokal, operasi import, edit, dan delete.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { LibraryManager } from '../services/library/LibraryManager.js';

export function useLibrary() {
  const [tracks, setTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const refreshLibrary = useCallback(async () => {
    try {
      const data = await LibraryManager.getAllTracks();
      setTracks(data);
      setError(null);
    } catch (err) {
      console.error('[useLibrary] Failed to load library tracks:', err);
      setError(err.message || 'Failed to load music library');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    LibraryManager.getAllTracks()
      .then((data) => {
        if (isMounted) {
          setTracks(data);
          setError(null);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('[useLibrary] Failed to load library tracks on mount:', err);
          setError(err.message || 'Failed to load music library');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const importFiles = useCallback(
    async (items) => {
      try {
        setIsLoading(true);
        const result = await LibraryManager.importItems(items);
        await refreshLibrary();
        return result;
      } catch (err) {
        console.error('[useLibrary] Import failed:', err);
        setError(err.message || 'Import failed');
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshLibrary]
  );

  const updateTrack = useCallback(
    async (trackId, metadata) => {
      try {
        const updated = await LibraryManager.updateTrack(trackId, metadata);
        setTracks((prev) =>
          prev.map((t) => (t.trackId === trackId ? { ...t, ...metadata } : t))
        );
        return updated;
      } catch (err) {
        console.error('[useLibrary] Update failed:', err);
        setError(err.message || 'Failed to update track');
        throw err;
      }
    },
    []
  );

  const deleteTrack = useCallback(
    async (trackId) => {
      try {
        await LibraryManager.deleteTrack(trackId);
        setTracks((prev) => prev.filter((t) => t.trackId !== trackId));
      } catch (err) {
        console.error('[useLibrary] Delete failed:', err);
        setError(err.message || 'Failed to delete track');
        throw err;
      }
    },
    []
  );

  const filteredTracks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tracks;
    return tracks.filter(
      (t) =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.artist && t.artist.toLowerCase().includes(q)) ||
        (t.album && t.album.toLowerCase().includes(q))
    );
  }, [tracks, searchQuery]);

  return {
    tracks: filteredTracks,
    allTracksCount: tracks.length,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    refreshLibrary,
    importFiles,
    updateTrack,
    deleteTrack,
    resolveTrackSource: LibraryManager.resolveTrackSource,
  };
}
