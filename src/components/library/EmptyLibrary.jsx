import { FolderOpen, Music, UploadCloud } from 'lucide-react';

export function EmptyLibrary({ onImportClick, isDragging, onDragOver, onDragLeave, onDrop }) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`w-full min-h-[360px] rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center p-8 text-center ${
        isDragging
          ? 'border-emerald-400/60 bg-emerald-950/20 backdrop-blur-md'
          : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04] backdrop-blur-md'
      }`}
    >
      <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-300 mb-4 shadow-lg shadow-black/20">
        {isDragging ? (
          <UploadCloud className="w-8 h-8 text-emerald-400 animate-bounce" />
        ) : (
          <Music className="w-8 h-8 text-zinc-300" />
        )}
      </div>

      <h3 className="text-lg font-semibold text-zinc-100 mb-1">
        {isDragging ? 'Drop audio files here' : 'Your Music Library is Empty'}
      </h3>
      <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
        Import your local music files (MP3, WAV, FLAC, AAC, M4A) to start listening. Your files stay on your device without binary duplication.
      </p>

      <button
        type="button"
        onClick={onImportClick}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-zinc-100 font-medium text-sm border border-white/15 backdrop-blur-lg transition-all shadow-lg shadow-black/30"
      >
        <FolderOpen className="w-4 h-4 text-zinc-300" />
        Import Audio Files
      </button>
    </div>
  );
}
