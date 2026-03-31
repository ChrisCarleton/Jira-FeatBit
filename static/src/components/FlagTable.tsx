import type { Environment, FlagRow } from '../types';

function StatusBadge({ isEnabled }: { isEnabled: boolean | null }) {
  if (isEnabled === null) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#2C333A] text-[#8C9BAB]">
        N/A
      </span>
    );
  }
  if (isEnabled) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#1C3329] text-[#4BCE97]">
        Enabled
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#2C333A] text-[#626F86]">
      Disabled
    </span>
  );
}

interface Props {
  flags: FlagRow[];
  environments: Environment[];
}

export default function FlagTable({ flags, environments }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="text-left px-2.5 py-1.5 text-[11px] font-bold text-[#8C9BAB] uppercase tracking-wider border-b-2 border-[#454F59] whitespace-nowrap">
              Flag
            </th>
            {environments.map((env) => (
              <th
                key={env.id}
                className="text-center px-2.5 py-1.5 text-[11px] font-bold text-[#8C9BAB] uppercase tracking-wider border-b-2 border-[#454F59] whitespace-nowrap"
              >
                {env.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {flags.map((flag) => (
            <tr key={flag.key}>
              <td className="px-2.5 py-2 border-b border-[#2C333A] text-[#B6C2CF] align-middle">
                <span className="block font-medium">{flag.name}</span>
                <span className="font-mono text-[11px] text-[#8C9BAB]">
                  {flag.key}
                </span>
              </td>
              {environments.map((env) => {
                const envStatus = flag.environments.find(
                  (e) => e.envId === env.id
                );
                return (
                  <td
                    key={env.id}
                    className="px-2.5 py-2 border-b border-[#2C333A] text-center align-middle"
                  >
                    <StatusBadge isEnabled={envStatus?.isEnabled ?? null} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
