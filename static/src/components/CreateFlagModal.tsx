import { useEffect, useRef, useState } from 'react';
import { createFlag } from '../api';

/** Convert a human-readable name to a valid FeatBit flag key */
function nameToKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

interface Props {
  issueKey: string;
  onClose: () => void;
  onDone: () => void;
}

export default function CreateFlagModal({ issueKey, onClose, onDone }: Props) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!keyEdited) setKey(nameToKey(val));
  };

  const handleKeyChange = (val: string) => {
    setKey(val);
    setKeyEdited(true);
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Flag name is required.');
      return;
    }
    if (!key.trim()) {
      setError('Flag key is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await createFlag({
      issueKey,
      name: name.trim(),
      key: key.trim(),
    });
    setSubmitting(false);
    const failed = res.results?.filter((r) => !r.success) ?? [];
    if (failed.length > 0) {
      setError(
        `Failed in: ${failed.map((f) => `${f.envName} – ${f.error ?? 'unknown error'}`).join('; ')}`
      );
    } else {
      onDone();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') void handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-[rgba(9,30,66,0.54)] flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#282E33] rounded w-[440px] max-w-[90vw] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        role="dialog"
        aria-modal
      >
        <h2 className="text-base font-bold text-[#B6C2CF] mb-4">
          Create feature flag
        </h2>
        <p className="text-xs text-[#8C9BAB] mb-4">
          The flag will be created in all configured environments and tagged
          with <strong>{issueKey}</strong>.
        </p>

        {error && (
          <div className="px-3 py-2 bg-[#3D1508] border border-[#F15B50] rounded text-sm text-[#F15B50] mb-3">
            {error}
          </div>
        )}

        <label className="block text-xs font-semibold text-[#8C9BAB] mb-1">
          Flag name
        </label>
        <input
          ref={nameRef}
          className="w-full px-2.5 py-1.5 bg-[#22272B] border-2 border-[#454F59] rounded text-sm text-[#B6C2CF] outline-none focus:border-[#579DFF] mb-3"
          type="text"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. My New Feature"
        />

        <label className="block text-xs font-semibold text-[#8C9BAB] mb-1">
          Flag key
        </label>
        <input
          className="w-full px-2.5 py-1.5 bg-[#22272B] border-2 border-[#454F59] rounded text-sm text-[#B6C2CF] outline-none focus:border-[#579DFF] mb-3"
          type="text"
          value={key}
          onChange={(e) => handleKeyChange(e.target.value)}
          placeholder="e.g. my-new-feature"
        />

        <div className="flex justify-end gap-2 mt-2">
          <button
            className="px-4 py-1.5 bg-[#2C333A] text-[#B6C2CF] border border-[#454F59] rounded text-sm font-medium cursor-pointer disabled:opacity-50"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            className="px-4 py-1.5 bg-[#0C66E4] text-white border-0 rounded text-sm font-medium cursor-pointer disabled:opacity-50"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={submitting}
          >
            {submitting ? 'Creating…' : 'Create flag'}
          </button>
        </div>
      </div>
    </div>
  );
}
