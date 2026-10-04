import { Search, X } from 'lucide-react';

export function SearchBar({ value, onChange, placeholder = 'Search songs, artists, or albums...' }) {
  return (
    <div className="relative w-full max-w-md">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
        <Search className="w-4 h-4" />
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-9 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] focus:bg-white/[0.09] border border-white/10 focus:border-white/30 text-zinc-100 placeholder-zinc-500 text-sm backdrop-blur-md transition-all outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-400 hover:text-zinc-100 transition-colors"
          title="Clear search"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
