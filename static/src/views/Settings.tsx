import { useEffect, useRef, useState } from 'react';
import { fetchEnvironments, getConfig, saveConfig } from '../api';
import type { Environment } from '../types';

export default function Settings() {
  const [apiUrl, setApiUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [hasToken, setHasToken] = useState(false);
  const [tokenPlaceholder, setTokenPlaceholder] =
    useState('Enter access token');
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchMsg, setFetchMsg] = useState<string | null>(null);
  const [fetchMsgFading, setFetchMsgFading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveMsgFading, setSaveMsgFading] = useState(false);
  const tokenRef = useRef<HTMLInputElement>(null);
  const saveMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void getConfig().then((cfg) => {
      if (!cfg) return;
      setApiUrl(cfg.apiUrl);
      setEnvironments(cfg.environments ?? []);
      if (cfg.hasToken) {
        setHasToken(true);
        setTokenPlaceholder('(token saved – leave blank to keep)');
      }
    });
  }, []);

  const handleFetchEnvs = async () => {
    const token = accessToken || (tokenRef.current?.value ?? '');
    if (!apiUrl || (!token && !hasToken)) {
      setFetchError('Enter both the API URL and access token first.');
      return;
    }
    if (!apiUrl.startsWith('https://')) {
      setFetchError(
        'API URL must use HTTPS (e.g. https://your-featbit-instance.com).'
      );
      return;
    }
    setFetching(true);
    setFetchError(null);
    setFetchMsg(null);
    const res = await fetchEnvironments({ apiUrl, accessToken: token });
    setFetching(false);
    if (res.error) {
      setFetchError(res.error);
    } else {
      setEnvironments(res.environments ?? []);
      const count = res.environments?.length ?? 0;
      setFetchMsgFading(false);
      setFetchMsg(
        `Connection successful — ${count} environment${count !== 1 ? 's' : ''} loaded.`
      );
      if (fetchMsgTimer.current) clearTimeout(fetchMsgTimer.current);
      fetchMsgTimer.current = setTimeout(() => {
        setFetchMsgFading(true);
        setTimeout(() => {
          setFetchMsg(null);
          setFetchMsgFading(false);
        }, 200);
      }, 3300);
    }
  };

  const handleSave = async () => {
    if (!apiUrl) {
      setSaveMsg(null);
      setFetchError('API URL is required.');
      return;
    }
    if (!apiUrl.startsWith('https://')) {
      setSaveMsg(null);
      setFetchError(
        'API URL must use HTTPS (e.g. https://your-featbit-instance.com).'
      );
      return;
    }
    if (!accessToken && !hasToken && environments.length === 0) {
      setFetchError(
        'Fetch environments before saving, or provide an access token.'
      );
      return;
    }
    setSaving(true);
    setSaveMsg(null);
    await saveConfig({ apiUrl, accessToken, environments });
    setSaving(false);
    setSaveMsg('Settings saved successfully.');
    if (accessToken) {
      setHasToken(true);
      setTokenPlaceholder('(token saved – leave blank to keep)');
    }
    setSaveMsgFading(false);
    if (saveMsgTimer.current) clearTimeout(saveMsgTimer.current);
    saveMsgTimer.current = setTimeout(() => {
      setSaveMsgFading(true);
      setTimeout(() => {
        setSaveMsg(null);
        setSaveMsgFading(false);
      }, 200);
    }, 3300);
  };

  const handleEnvNameChange = (id: string, name: string) => {
    setEnvironments((prev) =>
      prev.map((e) => (e.id === id ? { ...e, name } : e))
    );
  };

  const inputCls =
    'w-full px-2.5 py-1.5 bg-[#22272B] border-2 border-[#454F59] rounded text-sm text-[#B6C2CF] outline-none focus:border-[#579DFF] mb-3';

  return (
    <div className="p-5 max-w-xl">
      <h1 className="text-lg font-bold text-[#B6C2CF] mb-5">
        FeatBit Settings
      </h1>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-[#B6C2CF] mb-2">
          Connection
        </h2>

        <label className="block text-xs font-semibold text-[#8C9BAB] mb-1">
          API Base URL
        </label>
        <input
          className={inputCls}
          type="url"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder="https://your-featbit-instance.com:5000"
        />

        <label className="block text-xs font-semibold text-[#8C9BAB] mb-1">
          Access Token
        </label>
        <input
          ref={tokenRef}
          className={inputCls}
          type="password"
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder={tokenPlaceholder}
        />

        <button
          className="px-4 py-1.5 bg-[#2C333A] text-[#B6C2CF] border border-[#454F59] rounded text-sm font-medium cursor-pointer disabled:opacity-50"
          onClick={() => {
            void handleFetchEnvs();
          }}
          disabled={fetching}
        >
          {fetching ? 'Loading…' : 'Test connection & load environments'}
        </button>
      </div>

      {fetchError && (
        <div className="px-3.5 py-2.5 bg-[#3D1508] border border-[#F15B50] rounded text-sm text-[#F15B50] mb-3 animate-fade-in">
          {fetchError}
        </div>
      )}

      {fetchMsg && (
        <div
          className={`px-3.5 py-2.5 bg-[#1C3329] border border-[#4BCE97] rounded text-sm text-[#4BCE97] mb-3 ${fetchMsgFading ? 'animate-fade-out' : 'animate-fade-in'}`}
        >
          {fetchMsg}
        </div>
      )}

      {environments.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#B6C2CF] mb-2">
            Environments ({environments.length} found)
          </h2>
          <p className="text-xs text-[#8C9BAB] mb-2">
            Rename environments if you’d like a shorter display name in the
            issue panel.
          </p>
          <table className="w-full border-collapse mt-2">
            <thead>
              <tr>
                <th className="text-left px-2 py-1.5 text-xs font-semibold text-[#8C9BAB] border-b-2 border-[#454F59]">
                  Display Name
                </th>
                <th className="text-left px-2 py-1.5 text-xs font-semibold text-[#8C9BAB] border-b-2 border-[#454F59]">
                  Key
                </th>
                <th className="text-left px-2 py-1.5 text-xs font-semibold text-[#8C9BAB] border-b-2 border-[#454F59]">
                  ID
                </th>
              </tr>
            </thead>
            <tbody>
              {environments.map((env) => (
                <tr key={env.id}>
                  <td className="px-2 py-1.5 text-sm border-b border-[#2C333A] text-[#B6C2CF]">
                    <input
                      className="w-full px-2.5 py-1.5 bg-[#22272B] border-2 border-[#454F59] rounded text-sm text-[#B6C2CF] outline-none focus:border-[#579DFF]"
                      value={env.name}
                      onChange={(e) =>
                        handleEnvNameChange(env.id, e.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5 text-sm border-b border-[#2C333A] text-[#B6C2CF]">
                    <code className="text-xs">{env.key}</code>
                  </td>
                  <td className="px-2 py-1.5 text-sm border-b border-[#2C333A]">
                    <code className="text-[11px] text-[#8C9BAB]">{env.id}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {saveMsg && (
        <div
          className={`px-3.5 py-2.5 bg-[#1C3329] border border-[#4BCE97] rounded text-sm text-[#4BCE97] mb-3 ${saveMsgFading ? 'animate-fade-out' : 'animate-fade-in'}`}
        >
          {saveMsg}
        </div>
      )}

      <button
        className="px-4 py-1.5 bg-[#0C66E4] text-white border-0 rounded text-sm font-medium cursor-pointer disabled:opacity-50"
        onClick={() => {
          void handleSave();
        }}
        disabled={saving}
      >
        {saving ? 'Saving…' : 'Save settings'}
      </button>
    </div>
  );
}
