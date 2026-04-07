// FeatBit REST API client
// All calls are made server-side from Forge resolver functions so the access
// token never leaves the Forge backend.

import { v7 as uuidv7 } from 'uuid';

export interface FeatBitConfig {
  apiUrl: string;
  accessToken: string;
}

export interface Environment {
  id: string;
  key: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  key: string;
  environments: Environment[];
}

export interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  isEnabled: boolean;
  isArchived: boolean;
  tags: string[];
  description?: string;
  variationType: string;
  updatedAt: string;
}

export interface FlagListResponse {
  items: FeatureFlag[];
  totalCount: number;
}

function headers(accessToken: string): Record<string, string> {
  // Strip any accidental 'Bearer ' prefix the user may have pasted.
  // The FeatBit management API expects the raw token with no scheme prefix:
  //   Authorization: <token>
  const raw = accessToken.replace(/^Bearer\s+/i, '');
  return {
    Authorization: raw,
    'Content-Type': 'application/json',
    // Bypass the ngrok browser-warning interstitial page on free-tier tunnels.
    // Ignored by non-ngrok servers.
    'ngrok-skip-browser-warning': 'true',
  };
}

async function safeFetch(url: string, opts: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Return all projects with their environments populated.
 *
 * Some FeatBit versions embed environments directly in the project list
 * response; others require a separate GET /api/v1/envs?projectKey=… call.
 * This function handles both cases transparently.
 */
export async function listProjects(config: FeatBitConfig): Promise<Project[]> {
  const params = new URLSearchParams({ pageIndex: '0', pageSize: '100' });
  const res = await safeFetch(
    `${config.apiUrl}/api/v1/projects?${params.toString()}`,
    { headers: headers(config.accessToken) }
  );
  if (!res.ok) {
    throw new Error(`FeatBit API ${res.status}: ${await res.text()}`);
  }
  const envelope = (await res.json()) as {
    success?: boolean;
    data?: unknown;
    items?: Project[];
  };
  // Unwrap the standard FeatBit response envelope: { success, errors, data }
  // The inner data is either a Project[] directly or a paged { items: Project[] }.
  const inner: unknown = envelope.data ?? envelope;
  const projects: Project[] = Array.isArray(inner)
    ? (inner as Project[])
    : ((inner as { items?: Project[] }).items ?? []);

  // If the API already embedded environments in at least one project, trust
  // the embedded data (an empty array means no envs configured there).
  const embedsEnvironments = projects.some((p) => p.environments !== undefined);
  if (embedsEnvironments) return projects;

  // Otherwise the API doesn't embed environments — fetch them per-project.
  await Promise.all(
    projects.map(async (p) => {
      const envParams = new URLSearchParams({
        projectKey: p.key,
        pageIndex: '0',
        pageSize: '100',
      });
      const envRes = await safeFetch(
        `${config.apiUrl}/api/v1/envs?${envParams.toString()}`,
        { headers: headers(config.accessToken) }
      );
      if (!envRes.ok) return; // not all versions expose this endpoint
      const envData: unknown = await envRes.json();
      const envs: Environment[] = Array.isArray(envData)
        ? (envData as Environment[])
        : ((envData as { items?: Environment[] }).items ?? []);
      p.environments = envs;
    })
  );

  return projects;
}

/** List feature flags in a given environment, filtered by a single tag. */
export async function listFlagsByTag(
  config: FeatBitConfig,
  envId: string,
  tag: string
): Promise<FeatureFlag[]> {
  const params = new URLSearchParams({
    pageIndex: '0',
    pageSize: '50',
    tags: tag,
    isArchived: 'false',
  });
  const res = await safeFetch(
    `${config.apiUrl}/api/v1/envs/${encodeURIComponent(envId)}/feature-flags?${params.toString()}`,
    { headers: headers(config.accessToken) }
  );
  if (!res.ok) {
    throw new Error(`FeatBit API ${res.status}: ${await res.text()}`);
  }
  const envelope = (await res.json()) as {
    data?: FlagListResponse;
  } & FlagListResponse;
  const inner = envelope.data ?? envelope;
  return inner.items ?? [];
}

/** Full-text search for flags (by name or key) in a given environment. */
export async function searchFlags(
  config: FeatBitConfig,
  envId: string,
  query: string
): Promise<FeatureFlag[]> {
  const params = new URLSearchParams({
    pageIndex: '0',
    pageSize: '20',
    searchText: query,
    isArchived: 'false',
  });
  const res = await safeFetch(
    `${config.apiUrl}/api/v1/envs/${encodeURIComponent(envId)}/feature-flags?${params.toString()}`,
    { headers: headers(config.accessToken) }
  );
  if (!res.ok) {
    throw new Error(`FeatBit API ${res.status}: ${await res.text()}`);
  }
  const envelope = (await res.json()) as {
    data?: FlagListResponse;
  } & FlagListResponse;
  const inner = envelope.data ?? envelope;
  return inner.items ?? [];
}

/**
 * Create a boolean feature flag in a given environment.
 * The flag starts disabled and is tagged with the supplied tags.
 */
export async function createFlag(
  config: FeatBitConfig,
  envId: string,
  name: string,
  key: string,
  tags: string[],
  description = ''
): Promise<FeatureFlag> {
  // Variation IDs must be stable UUIDs supplied by the caller.
  const trueId = uuidv7();
  const falseId = uuidv7();
  const body = {
    envId,
    name,
    key,
    description,
    tags,
    isEnabled: false,
    variationType: 'boolean',
    variations: [
      { id: trueId, name: 'true', value: 'true' },
      { id: falseId, name: 'false', value: 'false' },
    ],
    enabledVariationId: trueId,
    disabledVariationId: falseId,
  };
  const res = await safeFetch(
    `${config.apiUrl}/api/v1/envs/${encodeURIComponent(envId)}/feature-flags`,
    {
      method: 'POST',
      headers: headers(config.accessToken),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    throw new Error(`FeatBit API ${res.status}: ${await res.text()}`);
  }
  const envelope = (await res.json()) as { data?: FeatureFlag } & FeatureFlag;
  return envelope.data ?? envelope;
}

/**
 * Toggle a feature flag on or off in a specific environment.
 * PUT /api/v1/envs/{envId}/feature-flags/{key}/toggle/{status}
 */
export async function toggleFlag(
  config: FeatBitConfig,
  envId: string,
  flagKey: string,
  enable: boolean
): Promise<void> {
  const status = enable ? 'true' : 'false';
  const res = await safeFetch(
    `${config.apiUrl}/api/v1/envs/${encodeURIComponent(envId)}/feature-flags/${encodeURIComponent(flagKey)}/toggle/${status}`,
    {
      method: 'PUT',
      headers: headers(config.accessToken),
    }
  );
  if (!res.ok) {
    throw new Error(`FeatBit API ${res.status}: ${await res.text()}`);
  }
}

/**
 * Replace the full tags array for a flag.
 * Fetch the flag first (via searchFlags) to get its existing tags before calling this.
 */
export async function updateFlagTags(
  config: FeatBitConfig,
  envId: string,
  flagId: string,
  tags: string[]
): Promise<void> {
  const res = await safeFetch(
    `${config.apiUrl}/api/v1/envs/${encodeURIComponent(envId)}/feature-flags/${encodeURIComponent(flagId)}/tags`,
    {
      method: 'PUT',
      headers: headers(config.accessToken),
      body: JSON.stringify({ tags }),
    }
  );
  if (!res.ok) {
    throw new Error(`FeatBit API ${res.status}: ${await res.text()}`);
  }
}
