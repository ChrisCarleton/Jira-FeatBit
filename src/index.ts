import ResolverModule from '@forge/resolver';
import api, { route } from '@forge/api';
import { kvs } from '@forge/kvs';
import * as FeatBit from './featbit';

// ---------------------------------------------------------------------------
// Minimal typed wrapper around @forge/resolver
// (The package ships CommonJS types that aren't fully compatible with nodenext)
// ---------------------------------------------------------------------------

interface ResolverRequest {
  payload: Record<string, unknown>;
  context: Record<string, unknown>;
}

interface ResolverInstance {
  define(name: string, fn: (req: ResolverRequest) => Promise<unknown>): void;
  getDefinitions(): unknown;
}

// ---------------------------------------------------------------------------
// Types stored in Forge Storage
// ---------------------------------------------------------------------------

const resolver =
  new (ResolverModule as unknown as new () => ResolverInstance)();

interface StoredEnvironment {
  id: string;
  key: string;
  name: string;
}

interface StoredConfig {
  apiUrl: string;
  accessToken: string;
  environments: StoredEnvironment[];
  defaultEnvId?: string;
  portalUrl?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function loadConfig(): Promise<StoredConfig | null> {
  const raw: StoredConfig | undefined = await kvs.get('featbit-config');
  return raw ?? null;
}

/**
 * Returns the parent epic key for an issue, or null if the issue is already
 * an epic or has no parent epic.
 */
async function getParentEpicKey(issueKey: string): Promise<string | null> {
  try {
    const res = await api
      .asApp()
      .requestJira(
        route`/rest/api/3/issue/${issueKey}?fields=parent,issuetype`
      );
    const issue = (await res.json()) as {
      fields?: {
        issuetype?: { name?: string };
        parent?: { key?: string };
      };
    };
    if (issue.fields?.issuetype?.name === 'Epic') return issueKey;
    return issue.fields?.parent?.key ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Resolvers
// ---------------------------------------------------------------------------

// ── Config ──────────────────────────────────────────────────────────────────

resolver.define('getConfig', async () => {
  const cfg = await loadConfig();
  if (!cfg) return null;
  // Mask the access token – the frontend only needs to know whether one is set.
  return {
    apiUrl: cfg.apiUrl,
    hasToken: Boolean(cfg.accessToken),
    environments: cfg.environments,
    defaultEnvId: cfg.defaultEnvId,
    portalUrl: cfg.portalUrl,
  };
});

resolver.define('saveConfig', async (req) => {
  const { apiUrl, accessToken, environments, defaultEnvId, portalUrl } =
    req.payload as {
      apiUrl: string;
      accessToken: string;
      environments: StoredEnvironment[];
      defaultEnvId?: string;
      portalUrl?: string;
    };
  // If no token was submitted (user left the field blank to keep the saved one),
  // preserve the previously stored token instead of overwriting it with ''.
  let tokenToStore = accessToken;
  if (!tokenToStore) {
    const existing = await loadConfig();
    tokenToStore = existing?.accessToken ?? '';
  }
  await kvs.set('featbit-config', {
    apiUrl,
    accessToken: tokenToStore,
    environments,
    defaultEnvId: defaultEnvId ?? '',
    portalUrl: portalUrl ?? '',
  });
  return { success: true };
});

// ── Connection test / environment discovery (used by Settings page) ──────────

resolver.define('fetchEnvironments', async (req) => {
  const payload = req.payload as { apiUrl: string; accessToken: string };
  const apiUrl = payload.apiUrl;
  let accessToken = payload.accessToken;
  // If no token was supplied (saved-token flow after page reload), use stored one.
  if (!accessToken) {
    const stored = await loadConfig();
    accessToken = stored?.accessToken ?? '';
  }
  try {
    const featbitCfg: FeatBit.FeatBitConfig = { apiUrl, accessToken };
    const projects = await FeatBit.listProjects(featbitCfg);

    if (projects.length === 0) {
      return {
        error:
          'No projects returned from the FeatBit API. Verify that: (1) the API URL points to the management API (e.g. port 5000 or your hosted API server), not the evaluation server; and (2) your access token has access to at least one project.',
      };
    }

    const environments: StoredEnvironment[] = projects.flatMap(
      (p: FeatBit.Project) => p.environments ?? []
    );
    return { environments };
  } catch (err) {
    return { error: String(err) };
  }
});

// ── Main panel query ─────────────────────────────────────────────────────────

resolver.define('getFlagsForIssue', async (req) => {
  const { issueKey } = req.payload as { issueKey: string };

  const cfg = await loadConfig();
  if (!cfg) {
    return {
      error:
        'FeatBit is not configured. Open the FeatBit Settings page to set it up.',
    };
  }

  const featbitCfg = { apiUrl: cfg.apiUrl, accessToken: cfg.accessToken };

  // Collect tags to search for: the issue itself + its parent epic (if any).
  const parentKey = await getParentEpicKey(issueKey);
  const tagsToQuery = Array.from(
    new Set([
      issueKey,
      ...(parentKey && parentKey !== issueKey ? [parentKey] : []),
    ])
  );

  // For each environment, collect flags matching any of the tags.
  // Result: envId → flagKey → flag
  const flagsByEnv: Record<string, Record<string, FeatBit.FeatureFlag>> = {};

  for (const env of cfg.environments) {
    const inEnv: Record<string, FeatBit.FeatureFlag> = {};
    for (const tag of tagsToQuery) {
      try {
        const flags = await FeatBit.listFlagsByTag(featbitCfg, env.id, tag);
        for (const flag of flags) {
          inEnv[flag.key] = flag; // de-duplicate by key
        }
      } catch (err) {
        console.error(`Error querying env ${env.id} tag ${tag}:`, err);
      }
    }
    flagsByEnv[env.id] = inEnv;
  }

  // Merge into one row per unique flag key.
  const allKeys = new Set<string>();
  const meta: Record<string, { name: string; key: string; tags: string[] }> =
    {};

  for (const flags of Object.values(flagsByEnv)) {
    for (const [key, flag] of Object.entries(flags)) {
      allKeys.add(key);
      if (!meta[key])
        meta[key] = { name: flag.name, key: flag.key, tags: flag.tags };
    }
  }

  const flags = Array.from(allKeys).map((key) => ({
    ...meta[key],
    environments: cfg.environments.map((env) => ({
      envId: env.id,
      envName: env.name,
      isEnabled: flagsByEnv[env.id]?.[key]?.isEnabled ?? null,
      flagId: flagsByEnv[env.id]?.[key]?.id ?? null,
    })),
  }));

  return { flags, environments: cfg.environments, portalUrl: cfg.portalUrl };
});

// ── Flag search (for the "Link existing flag" modal) ─────────────────────────

resolver.define('searchFlags', async (req) => {
  const { query } = req.payload as { query: string };

  const cfg = await loadConfig();
  if (!cfg) return { error: 'FeatBit is not configured.' };

  const primaryEnv = cfg.environments[0];
  if (!primaryEnv) return { error: 'No environments configured.' };

  try {
    const flags = await FeatBit.searchFlags(
      { apiUrl: cfg.apiUrl, accessToken: cfg.accessToken },
      primaryEnv.id,
      query
    );
    return { flags };
  } catch (err) {
    return { error: String(err) };
  }
});

// ── Create a new flag ────────────────────────────────────────────────────────

resolver.define('createFlag', async (req) => {
  const { issueKey, name, key, description } = req.payload as {
    issueKey: string;
    name: string;
    key: string;
    description?: string;
  };

  const cfg = await loadConfig();
  if (!cfg) return { error: 'FeatBit is not configured.' };
  if (cfg.environments.length === 0)
    return {
      error:
        'No environments configured. Open FeatBit Settings and run "Test connection & load environments" first.',
    };

  const featbitCfg = { apiUrl: cfg.apiUrl, accessToken: cfg.accessToken };
  const tags = [issueKey];

  // If a default environment is configured, create only in that environment.
  const envsToCreate = cfg.defaultEnvId
    ? cfg.environments.filter((e) => e.id === cfg.defaultEnvId)
    : cfg.environments;

  if (envsToCreate.length === 0) {
    return {
      error: cfg.defaultEnvId
        ? 'The configured default environment was not found. Please re-save your settings.'
        : 'No environments configured. Open FeatBit Settings and run "Test connection & load environments" first.',
    };
  }

  const results = await Promise.all(
    envsToCreate.map(async (env) => {
      try {
        await FeatBit.createFlag(
          featbitCfg,
          env.id,
          name,
          key,
          tags,
          description ?? ''
        );
        return { envId: env.id, envName: env.name, success: true };
      } catch (err) {
        return {
          envId: env.id,
          envName: env.name,
          success: false,
          error: String(err),
        };
      }
    })
  );

  return { results };
});

// ── Link an existing flag to the current issue ───────────────────────────────

resolver.define('linkFlag', async (req) => {
  const { issueKey, flagKey } = req.payload as {
    issueKey: string;
    flagKey: string;
  };

  const cfg = await loadConfig();
  if (!cfg) return { error: 'FeatBit is not configured.' };
  if (cfg.environments.length === 0)
    return {
      error:
        'No environments configured. Open FeatBit Settings and run "Test connection & load environments" first.',
    };

  const featbitCfg = { apiUrl: cfg.apiUrl, accessToken: cfg.accessToken };

  const results = await Promise.all(
    cfg.environments.map(async (env) => {
      try {
        // Find the flag in this environment by key.
        const matches = await FeatBit.searchFlags(featbitCfg, env.id, flagKey);
        const flag = matches.find(
          (f: FeatBit.FeatureFlag) => f.key === flagKey
        );

        if (!flag) {
          return {
            envId: env.id,
            envName: env.name,
            success: false,
            error: 'Flag not found in this environment',
          };
        }

        // Add the tag only if it isn't already present.
        if (!flag.tags.includes(issueKey)) {
          await FeatBit.updateFlagTags(featbitCfg, env.id, flag.id, [
            ...flag.tags,
            issueKey,
          ]);
        }

        return { envId: env.id, envName: env.name, success: true };
      } catch (err) {
        return {
          envId: env.id,
          envName: env.name,
          success: false,
          error: String(err),
        };
      }
    })
  );

  return { results };
});

// ── Toggle a flag on/off in one environment ──────────────────────────────────

resolver.define('toggleFlag', async (req) => {
  const { envId, flagKey, enable } = req.payload as {
    envId: string;
    flagKey: string;
    enable: boolean;
  };

  const cfg = await loadConfig();
  if (!cfg) return { error: 'FeatBit is not configured.' };

  try {
    await FeatBit.toggleFlag(
      { apiUrl: cfg.apiUrl, accessToken: cfg.accessToken },
      envId,
      flagKey,
      enable
    );
    return { success: true };
  } catch (err) {
    return { error: String(err) };
  }
});

export const handler = resolver.getDefinitions();
