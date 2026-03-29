import type { Environment, FlagRow } from '../types';

function StatusBadge({ isEnabled }: { isEnabled: boolean | null }) {
  if (isEnabled === null) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-500">
        N/A
      </span>
    );
  }
  if (isEnabled) {
    return (
      <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-800">
        Enabled
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-gray-100 text-gray-700">
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
            <th className="text-left px-2.5 py-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap">
              Flag
            </th>
            {environments.map((env) => (
              <th
                key={env.id}
                className="text-center px-2.5 py-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider border-b-2 border-gray-200 whitespace-nowrap"
              >
                {env.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {flags.map((flag) => (
            <tr key={flag.key}>
              <td className="px-2.5 py-2 border-b border-gray-100 text-[#172B4D] align-middle">
                <span className="block font-medium">{flag.name}</span>
                <span className="font-mono text-[11px] text-gray-500">
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
                    className="px-2.5 py-2 border-b border-gray-100 text-center align-middle"
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
