import { useEffect, useRef, useState } from 'react';
import { linkFlag, searchFlags } from '../api';
import type { SearchFlag } from '../types';

interface Props {
  issueKey: string;
  onClose: () => void;
  onDone: () => void;
}

export default function LinkFlagModal({ issueKey, onClose, onDone }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchFlag[]>([]);
  const [selected, setSelected] = useState<SearchFlag | null>(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setSelected(null);
    const res = await searchFlags(query.trim());
    setSearching(false);
    setSearched(true);
    if (res.error) {
      setError(res.error);
    } else {
      setResults(res.flags ?? []);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleSearch();
    if (e.key === 'Escape') onClose();
  };

  const handleLink = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    const res = await linkFlag({ issueKey, flagKey: selected.key });
    setSubmitting(false);
    const failed = res.results?.filter((r) => !r.success) ?? [];
    if (failed.length > 0 && failed.length === (res.results?.length ?? 0)) {
      setError(
        `Failed: ${failed.map((f) => `${f.envName} – ${f.error ?? 'unknown'}`).join('; ')}`
      );
    } else {
      onDone();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-[rgba(9,30,66,0.54)] flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded w-[480px] max-w-[90vw] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        <h2 className="text-base font-bold text-[#172B4D] mb-4">
          Link existing flag
        </h2>
        <p className="text-xs text-gray-500 mb-4">
          Search for a feature flag and select it to tag it with{' '}
          <strong>{issueKey}</strong>.
        </p>

        {error && (
          <div className="px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700 mb-3">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <input
            ref={inputRef}
            className="flex-1 px-2.5 py-1.5 border-2 border-gray-200 rounded text-sm text-[#172B4D] outline-none focus:border-blue-500"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by flag name or key…"
          />
          <button
            className="px-3.5 py-1.5 bg-gray-100 text-[#172B4D] border border-gray-300 rounded text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50"
            onClick={() => {
              void handleSearch();
            }}
            disabled={searching}
          >
            {searching ? '…' : 'Search'}
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded mb-3">
          {!searched && (
            <div className="py-5 text-center text-gray-500 text-sm">
              Enter a search term above.
            </div>
          )}
          {searched && results.length === 0 && (
            <div className="py-5 text-center text-gray-500 text-sm">
              No flags found. Try a different search term.
            </div>
          )}
          {results.map((flag) => (
            <div
              key={flag.key}
              className={`px-3 py-2 cursor-pointer border-b border-gray-100 last:border-0 transition-colors ${
                selected?.key === flag.key ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
              onClick={() => setSelected(flag)}
            >
              <div className="font-medium text-[#172B4D] text-sm">
                {flag.name}
              </div>
              <div className="font-mono text-[11px] text-gray-500">
                {flag.key}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-1.5 bg-gray-100 text-[#172B4D] border border-gray-300 rounded text-sm font-medium cursor-pointer disabled:opacity-50"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className={`px-4 py-1.5 bg-blue-700 text-white border-0 rounded text-sm font-medium cursor-pointer disabled:opacity-50 ${
              !selected ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => {
              void handleLink();
            }}
            disabled={!selected || submitting}
          >
            {submitting ? 'Linking…' : 'Link flag'}
          </button>
        </div>
      </div>
    </div>
  );
}
