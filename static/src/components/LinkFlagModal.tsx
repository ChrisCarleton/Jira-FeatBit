import { useEffect, useRef, useState } from 'react';
import { linkFlag, searchFlags } from '../api';
import type { SearchFlag } from '../types';

interface Props {
  issueKey: string;
  onClose: () => void;
  onDone: (msg?: string) => void;
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
    if (res.error) {
      setError(res.error);
      return;
    }
    const failed = res.results?.filter((r) => !r.success) ?? [];
    if (failed.length > 0 && failed.length === (res.results?.length ?? 0)) {
      setError(
        `Failed: ${failed.map((f) => `${f.envName} – ${f.error ?? 'unknown'}`).join('; ')}`
      );
    } else {
      onDone('Flag linked successfully.');
    }
  };

  return (
    <div
      className="absolute inset-0 bg-[rgba(9,30,66,0.54)] flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#282E33] rounded w-[480px] max-w-[90vw] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        <h2 className="text-base font-bold text-[#B6C2CF] mb-4">
          Link existing flag
        </h2>
        <p className="text-xs text-[#8C9BAB] mb-4">
          Search for a feature flag and select it to tag it with{' '}
          <strong>{issueKey}</strong>.
        </p>

        {error && (
          <div className="px-3 py-2 bg-[#3D1508] border border-[#F15B50] rounded text-sm text-[#F15B50] mb-3">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <input
            ref={inputRef}
            className="flex-1 px-2.5 py-1.5 bg-[#22272B] border-2 border-[#454F59] rounded text-sm text-[#B6C2CF] outline-none focus:border-[#579DFF]"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by flag name or key…"
          />
          <button
            className="px-3.5 py-1.5 bg-[#2C333A] text-[#B6C2CF] border border-[#454F59] rounded text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50"
            onClick={() => {
              void handleSearch();
            }}
            disabled={searching}
          >
            {searching ? '…' : 'Search'}
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto border border-[#454F59] rounded mb-3 bg-[#22272B]">
          {!searched && (
            <div className="py-5 text-center text-[#8C9BAB] text-sm">
              Enter a search term above.
            </div>
          )}
          {searched && results.length === 0 && (
            <div className="py-5 text-center text-[#8C9BAB] text-sm">
              No flags found. Try a different search term.
            </div>
          )}
          {results.map((flag) => (
            <div
              key={flag.key}
              className={`px-3 py-2 cursor-pointer border-b border-[#2C333A] last:border-0 transition-colors ${
                selected?.key === flag.key
                  ? 'bg-[#1C2B42]'
                  : 'hover:bg-[#22272B]'
              }`}
              onClick={() => setSelected(flag)}
            >
              <div className="font-medium text-[#B6C2CF] text-sm">
                {flag.name}
              </div>
              <div className="font-mono text-[11px] text-[#8C9BAB]">
                {flag.key}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-1.5 bg-[#2C333A] text-[#B6C2CF] border border-[#454F59] rounded text-sm font-medium cursor-pointer disabled:opacity-50"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className={`px-4 py-1.5 bg-[#0C66E4] text-white border-0 rounded text-sm font-medium cursor-pointer disabled:opacity-50 ${
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
