// FeatBit REST API client
// All calls are made server-side from Forge resolver functions so the access
// token never leaves the Forge backend.

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
  return {
    // FeatBit's OpenApiHandler reads Request.Headers.Authorization verbatim and
    // compares it to the stored token value (e.g. "api-xxx"). Sending a "Bearer"
    // scheme prefix would cause the lookup to fail. Pass the raw token directly.
    Authorization: accessToken,
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

/** Return all projects with their embedded environments. */
export async function listProjects(config: FeatBitConfig): Promise<Project[]> {
  const res = await safeFetch(`${config.apiUrl}/api/v1/projects`, {
    headers: headers(config.accessToken),
  });
  if (!res.ok) {
    throw new Error(`FeatBit API ${res.status}: ${await res.text()}`);
  }
  const data: unknown = await res.json();
  // Response is either { items: Project[] } or Project[]
  if (Array.isArray(data)) return data as Project[];
  const obj = data as { items?: Project[] };
  return obj.items ?? [];
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
  const data = (await res.json()) as FlagListResponse;
  return data.items ?? [];
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
  const data = (await res.json()) as FlagListResponse;
  return data.items ?? [];
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
  tags: string[]
): Promise<FeatureFlag> {
  const body = {
    name,
    key,
    description: '',
    tags,
    isEnabled: false,
    variationType: 'boolean',
    variations: [
      { name: 'true', value: 'true' },
      { name: 'false', value: 'false' },
    ],
    targetUsers: [],
    rules: [],
    fallThroughVariations: [{ variation: '1', percentage: 100 }],
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
  return res.json() as Promise<FeatureFlag>;
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
