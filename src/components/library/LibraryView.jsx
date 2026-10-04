import { AlertCircle, FolderPlus, Sparkles } from 'lucide-react';
import { useRef, useState } from 'react';
import { DeleteConfirmModal } from './DeleteConfirmModal.jsx';
import { EditTrackModal } from './EditTrackModal.jsx';
import { EmptyLibrary } from './EmptyLibrary.jsx';
import { SearchBar } from './SearchBar.jsx';
import { TrackList } from './TrackList.jsx';

export function LibraryView({
  tracks,
  allTracksCount,
  isLoading,
  error,
  searchQuery,
  onSearchChange,
  onImportFiles,
  onUpdateTrack,
  onDeleteTrack,
  activeTrackId,
  isPlaying,
  onPlayTrack,
  onPauseTrack,
}) {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingTrack, setEditingTrack] = useState(null);
  const [deletingTrack, setDeletingTrack] = useState(null);
  const [importNotice, setImportNotice] = useState(null);

  // Trigger file picker (Mendukung showOpenFilePicker jika tersedia, atau standard file input)
  const handleOpenPicker = async () => {
    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      try {
        const handles = await window.showOpenFilePicker({
          multiple: true,
          types: [
            {
              description: 'Audio Files',
              accept: {
                'audio/*': ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.ogg'],
              },
            },
          ],
        });

        if (handles && handles.length > 0) {
          const res = await onImportFiles(handles);
          if (res?.imported?.length > 0) {
            setImportNotice(`Successfully imported ${res.imported.length} audio file(s).`);
            setTimeout(() => setImportNotice(null), 4000);
          }
        }
        return;
      } catch (err) {
        // User membatalkan dialog atau browser melempar AbortError
        if (err.name === 'AbortError') return;
        console.warn('showOpenFilePicker failed, falling back to input:', err);
      }
    }

    // Fallback file input
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileInputChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const res = await onImportFiles(files);
      if (res?.imported?.length > 0) {
        setImportNotice(`Successfully imported ${res.imported.length} audio file(s).`);
        setTimeout(() => setImportNotice(null), 4000);
      }
    }
    // Reset file input agar user bisa memilih berkas yang sama jika diinginkan
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []).filter((f) =>
      f.type.startsWith('audio/') || /\.(mp3|wav|flac|aac|m4a|ogg)$/i.test(f.name)
    );
    if (files.length > 0) {
      const res = await onImportFiles(files);
      if (res?.imported?.length > 0) {
        setImportNotice(`Successfully imported ${res.imported.length} audio file(s).`);
        setTimeout(() => setImportNotice(null), 4000);
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="w-full flex flex-col space-y-6"
    >
      {/* Hidden file input for fallback file picker */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="audio/*,.mp3,.wav,.flac,.aac,.m4a,.ogg"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">Library</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.08] text-zinc-300 font-medium border border-white/10">
              {allTracksCount} {allTracksCount === 1 ? 'song' : 'songs'}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Local-first audio player with zero-binary duplicate storage
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SearchBar value={searchQuery} onChange={onSearchChange} />

          <button
            type="button"
            onClick={handleOpenPicker}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-zinc-950 font-medium text-sm transition-all shadow-lg shadow-emerald-500/20"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Import Music</span>
          </button>
        </div>
      </div>

      {/* Import Notice Banner */}
      {importNotice && (
        <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{importNotice}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading && allTracksCount === 0 ? (
        <div className="w-full py-20 flex flex-col items-center justify-center text-zinc-400 space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
          <span className="text-xs">Loading library...</span>
        </div>
      ) : allTracksCount === 0 ? (
        <EmptyLibrary
          onImportClick={handleOpenPicker}
          isDragging={isDragging}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        />
      ) : (
        <TrackList
          tracks={tracks}
          activeTrackId={activeTrackId}
          isPlaying={isPlaying}
          searchQuery={searchQuery}
          onPlay={onPlayTrack}
          onPause={onPauseTrack}
          onEdit={setEditingTrack}
          onDelete={setDeletingTrack}
        />
      )}

      {/* Modals */}
      <EditTrackModal
        key={editingTrack?.trackId || 'none'}
        track={editingTrack}
        isOpen={Boolean(editingTrack)}
        onClose={() => setEditingTrack(null)}
        onSave={onUpdateTrack}
      />

      <DeleteConfirmModal
        track={deletingTrack}
        isOpen={Boolean(deletingTrack)}
        onClose={() => setDeletingTrack(null)}
        onConfirm={onDeleteTrack}
      />
    </div>
  );
}
