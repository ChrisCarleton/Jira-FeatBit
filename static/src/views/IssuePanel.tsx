import { useCallback, useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import { getFlagsForIssue } from '../api';
import type { Environment, FlagRow } from '../types';
import FlagTable from '../components/FlagTable';
import CreateFlagModal from '../components/CreateFlagModal';
import LinkFlagModal from '../components/LinkFlagModal';

type Modal = 'create' | 'link' | null;

export default function IssuePanel() {
  const [issueKey, setIssueKey] = useState<string | null>(null);
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<Modal>(null);

  useEffect(() => {
    void view.getContext().then((ctx) => {
      const ext = ctx.extension as { issue?: { key?: string } } | undefined;
      setIssueKey(ext?.issue?.key ?? null);
    });
  }, []);

  const load = useCallback(async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getFlagsForIssue(key);
      if (res.error) {
        setError(res.error);
      } else {
        setFlags(res.flags ?? []);
        setEnvironments(res.environments ?? []);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (issueKey) void load(issueKey);
  }, [issueKey, load]);

  const handleDone = () => {
    setModal(null);
    if (issueKey) void load(issueKey);
  };

  if (!issueKey)
    return (
      <div className="px-4 py-3 border border-gray-200 rounded bg-gray-100 text-[#172B4D] leading-relaxed">
        Could not determine the current issue key.
      </div>
    );

  if (loading) return <div className="p-3 text-gray-500">Loading flags…</div>;

  if (error?.includes('not configured')) {
    return (
      <div className="px-4 py-3 border border-gray-200 rounded bg-gray-100 text-[#172B4D] leading-relaxed">
        FeatBit is not configured.{' '}
        <strong>Open the FeatBit Settings global page</strong> to enter your API
        URL and access token.
      </div>
    );
  }

  if (error)
    return (
      <div className="px-4 py-3 border border-red-200 rounded bg-red-50 text-red-700 leading-relaxed">
        {error}
      </div>
    );

  return (
    <div className="py-3">
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold text-sm text-[#172B4D]">
          {flags.length} flag{flags.length !== 1 ? 's' : ''} linked to{' '}
          {issueKey}
        </span>
        <div className="flex gap-2">
          <button
            className="px-3 py-1 text-sm font-medium rounded border border-gray-300 bg-gray-100 text-[#172B4D] cursor-pointer"
            onClick={() => setModal('link')}
          >
            Link existing flag
          </button>
          <button
            className="px-3 py-1 text-sm font-medium rounded border border-blue-700 bg-blue-700 text-white cursor-pointer"
            onClick={() => setModal('create')}
          >
            + Create flag
          </button>
        </div>
      </div>

      {flags.length === 0 ? (
        <div className="py-6 text-center text-gray-500">
          <div>No feature flags linked to {issueKey} yet.</div>
          <div className="mt-2 text-xs">
            Create a new flag or link an existing one tagged with{' '}
            <strong>{issueKey}</strong>.
          </div>
        </div>
      ) : (
        <FlagTable flags={flags} environments={environments} />
      )}

      {modal === 'create' && (
        <CreateFlagModal
          issueKey={issueKey}
          onClose={() => setModal(null)}
          onDone={handleDone}
        />
      )}
      {modal === 'link' && (
        <LinkFlagModal
          issueKey={issueKey}
          onClose={() => setModal(null)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
