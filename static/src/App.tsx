import { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import IssuePanel from './views/IssuePanel';
import Settings from './views/Settings';

export default function App() {
  const [moduleKey, setModuleKey] = useState<string | null>(null);
  const [ctxError, setCtxError] = useState<string | null>(null);

  useEffect(() => {
    view
      .getContext()
      .then((ctx) => setModuleKey(ctx.moduleKey))
      .catch((err: unknown) => setCtxError(String(err)));
  }, []);

  if (ctxError) {
    return (
      <div className="p-4 text-[#F15B50] border border-[#F15B50] rounded bg-[#3D1508] text-xs">
        Context error: {ctxError}
      </div>
    );
  }

  if (!moduleKey) {
    return <div className="p-4 text-[#8C9BAB]">Loading…</div>;
  }

  if (moduleKey === 'featbit-settings') {
    return <Settings />;
  }

  // Default: issue panel (moduleKey === 'featbit-flags-panel')
  return <IssuePanel />;
}
