import { useEffect, useState } from 'react';
import { view } from '@forge/bridge';
import IssuePanel from './views/IssuePanel';
import Settings from './views/Settings';

export default function App() {
  const [moduleKey, setModuleKey] = useState<string | null>(null);

  useEffect(() => {
    void view.getContext().then((ctx) => setModuleKey(ctx.moduleKey));
  }, []);

  if (!moduleKey) {
    return <div className="p-4 text-[#8C9BAB]">Loading…</div>;
  }

  if (moduleKey === 'featbit-settings') {
    return <Settings />;
  }

  // Default: issue panel (moduleKey === 'featbit-flags-panel')
  return <IssuePanel />;
}
