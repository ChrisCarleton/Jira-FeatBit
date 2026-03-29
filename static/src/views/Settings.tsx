import { useEffect, useRef, useState } from 'react';
import { fetchEnvironments, getConfig, saveConfig } from '../api';
import type { Environment } from '../types';

export default function Settings() {
  const [apiUrl, setApiUrl] = useState('http://localhost:5000');
  const [accessToken, setAccessToken] = useState('');
  const [tokenPlaceholder, setTokenPlaceholder] =
    useState('Enter access token');
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const tokenRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void getConfig().then((cfg) => {
      if (!cfg) return;
      setApiUrl(cfg.apiUrl);
      setEnvironments(cfg.environments);
      if (cfg.hasToken)
        setTokenPlaceholder('(token saved – leave blank to keep)');
    });
  }, []);

  const handleFetchEnvs = async () => {
    const token = accessToken || (tokenRef.current?.value ?? '');
    if (!apiUrl || !token) {
      setFetchError('Enter both the API URL and access token first.');
      return;
    }
    setFetching(true);
    setFetchError(null);
    const res = await fetchEnvironments({ apiUrl, accessToken: token });
    setFetching(false);
    if (res.error) {
      setFetchError(res.error);
    } else {
      setEnvironments(res.environments ?? []);
    }
  };

  const handleSave = async () => {
    if (!apiUrl) {
      setSaveMsg(null);
      setFetchError('API URL is required.');
      return;
    }
    if (!accessToken && environments.length === 0) {
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
    if (accessToken) setTokenPlaceholder('(token saved – leave blank to keep)');
  };

  const handleEnvNameChange = (id: string, name: string) => {
    setEnvironments((prev) =>
      prev.map((e) => (e.id === id ? { ...e, name } : e))
    );
  };

  const inputCls =
    'w-full px-2.5 py-1.5 border-2 border-gray-200 rounded text-sm text-[#172B4D] outline-none focus:border-blue-500 mb-3';

  return (
    <div className="p-5 max-w-xl">
      <h1 className="text-lg font-bold text-[#172B4D] mb-5">
        FeatBit Settings
      </h1>

      <div className="mb-6">
        <h2 className="text-sm font-semibold text-[#172B4D] mb-2">
          Connection
        </h2>

        <label className="block text-xs font-semibold text-gray-500 mb-1">
          API Base URL
        </label>
        <input
          className={inputCls}
          type="url"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder="http://localhost:5000"
        />

        <label className="block text-xs font-semibold text-gray-500 mb-1">
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
          className="px-4 py-1.5 bg-gray-100 text-[#172B4D] border border-gray-300 rounded text-sm font-medium cursor-pointer disabled:opacity-50"
          onClick={() => {
            void handleFetchEnvs();
          }}
          disabled={fetching}
        >
          {fetching ? 'Loading…' : 'Test connection & load environments'}
        </button>
      </div>

      {fetchError && (
        <div className="px-3.5 py-2.5 bg-red-50 border border-red-200 rounded text-sm text-red-700 mb-3">
          {fetchError}
        </div>
      )}

      {environments.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-[#172B4D] mb-2">
            Environments ({environments.length} found)
          </h2>
          <p className="text-xs text-gray-500 mb-2">
            Rename environments if you’d like a shorter display name in the
            issue panel.
          </p>
          <table className="w-full border-collapse mt-2">
            <thead>
              <tr>
                <th className="text-left px-2 py-1.5 text-xs font-semibold text-gray-500 border-b-2 border-gray-200">
                  Display Name
                </th>
                <th className="text-left px-2 py-1.5 text-xs font-semibold text-gray-500 border-b-2 border-gray-200">
                  Key
                </th>
                <th className="text-left px-2 py-1.5 text-xs font-semibold text-gray-500 border-b-2 border-gray-200">
                  ID
                </th>
              </tr>
            </thead>
            <tbody>
              {environments.map((env) => (
                <tr key={env.id}>
                  <td className="px-2 py-1.5 text-sm border-b border-gray-100 text-[#172B4D]">
                    <input
                      className="w-full px-2.5 py-1.5 border-2 border-gray-200 rounded text-sm text-[#172B4D] outline-none focus:border-blue-500"
                      value={env.name}
                      onChange={(e) =>
                        handleEnvNameChange(env.id, e.target.value)
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5 text-sm border-b border-gray-100">
                    <code className="text-xs">{env.key}</code>
                  </td>
                  <td className="px-2 py-1.5 text-sm border-b border-gray-100">
                    <code className="text-[11px] text-gray-500">{env.id}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {saveMsg && (
        <div className="px-3.5 py-2.5 bg-green-50 border border-green-200 rounded text-sm text-green-800 mb-3">
          {saveMsg}
        </div>
      )}

      <button
        className="px-4 py-1.5 bg-blue-700 text-white border-0 rounded text-sm font-medium cursor-pointer disabled:opacity-50"
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
