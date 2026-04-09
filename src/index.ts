import ResolverModule from '@forge/resolver';
import api, { route } from '@forge/api';
import { kvs } from '@forge/kvs';
import * as FeatBit from './featbit';
import {
  sendSlackNotification,
  buildFlagCreatedBlocks,
  buildFlagToggledBlocks,
} from './slack';

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
  projectId: string;
  projectName: string;
  readOnly?: boolean;
}

interface StoredConfig {
  apiUrl: string;
  accessToken: string;
  environments: StoredEnvironment[];
  defaultEnvId?: string;
  portalUrl?: string;
  slackBotToken?: string;
  slackChannelId?: string;
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

/**
 * Returns the Jira display name for the given accountId, or a fallback string.
 * Used to attribute actions in FeatBit flag descriptions and Jira comments.
 */
async function getActorDisplayName(
  accountId: string | undefined
): Promise<string> {
  if (!accountId) return 'a Jira user';
  try {
    const res = await api
      .asApp()
      .requestJira(route`/rest/api/3/user?accountId=${accountId}`);
    const user = (await res.json()) as { displayName?: string };
    return user.displayName ?? accountId;
  } catch {
    return accountId;
  }
}

/**
 * Posts a plain-text comment on a Jira issue. Best-effort — never throws so
 * that a comment failure cannot break the primary flag operation.
 */
async function postJiraComment(issueKey: string, text: string): Promise<void> {
  try {
    await api
      .asApp()
      .requestJira(route`/rest/api/3/issue/${issueKey}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: {
            version: 1,
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text }],
              },
            ],
          },
        }),
      });
  } catch {
    // Best-effort — never fail the primary operation because of this
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
    hasSlackToken: Boolean(cfg.slackBotToken),
    slackChannelId: cfg.slackChannelId ?? '',
  };
});

resolver.define('saveConfig', async (req) => {
  const {
    apiUrl,
    accessToken,
    environments,
    defaultEnvId,
    portalUrl,
    slackBotToken,
    slackChannelId,
  } = req.payload as {
    apiUrl: string;
    accessToken: string;
    environments: StoredEnvironment[];
    defaultEnvId?: string;
    portalUrl?: string;
    slackBotToken?: string;
    slackChannelId?: string;
  };
  // If no token was submitted (user left the field blank to keep the saved one),
  // preserve the previously stored token instead of overwriting it with ''.
  const existing = await loadConfig();
  let tokenToStore = accessToken;
  if (!tokenToStore) {
    tokenToStore = existing?.accessToken ?? '';
  }
  let slackTokenToStore = slackBotToken ?? '';
  if (!slackTokenToStore) {
    slackTokenToStore = existing?.slackBotToken ?? '';
  }
  await kvs.set('featbit-config', {
    apiUrl,
    accessToken: tokenToStore,
    environments,
    defaultEnvId: defaultEnvId ?? '',
    portalUrl: portalUrl ?? '',
    slackBotToken: slackTokenToStore,
    slackChannelId: slackChannelId ?? '',
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
      (p: FeatBit.Project) =>
        (p.environments ?? []).map((e) => ({
          ...e,
          projectId: p.id,
          projectName: p.name,
        }))
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

  return {
    flags,
    environments: cfg.environments,
    portalUrl: cfg.portalUrl,
    canCreateFlag: cfg.defaultEnvId !== '__none__',
    readOnlyEnvIds: cfg.environments.filter((e) => e.readOnly).map((e) => e.id),
  };
});

// ── Flag search (for the "Link existing flag" modal) ─────────────────────────

resolver.define('searchFlags', async (req) => {
  const { query } = req.payload as { query: string };

  const cfg = await loadConfig();
  if (!cfg) return { error: 'FeatBit is not configured.' };
  if (cfg.environments.length === 0)
    return { error: 'No environments configured.' };

  const featbitCfg = { apiUrl: cfg.apiUrl, accessToken: cfg.accessToken };

  // Search all environments and deduplicate by key so a flag is returned
  // even if it only exists in a subset of environments.
  const seen = new Map<string, FeatBit.FeatureFlag>();
  const errors: string[] = [];
  await Promise.all(
    cfg.environments.map(async (env) => {
      try {
        const results = await FeatBit.searchFlags(featbitCfg, env.id, query);
        for (const flag of results) {
          if (!seen.has(flag.key)) seen.set(flag.key, flag);
        }
      } catch (err) {
        errors.push(String(err));
      }
    })
  );

  if (seen.size === 0 && errors.length > 0) {
    return { error: errors[0] };
  }

  return { flags: Array.from(seen.values()) };
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
  if (cfg.defaultEnvId === '__none__')
    return {
      error:
        'Flag creation is disabled. Update the Default Environment setting to enable it.',
    };
  if (cfg.environments.length === 0)
    return {
      error:
        'No environments configured. Open FeatBit Settings and run "Test connection & load environments" first.',
    };

  const featbitCfg = { apiUrl: cfg.apiUrl, accessToken: cfg.accessToken };
  const tags = [issueKey];

  // Resolve the Jira user who triggered this action for attribution.
  const actorName = await getActorDisplayName(
    req.context?.accountId as string | undefined
  );
  // Embed attribution in the flag description so it appears in FeatBit's UI.
  const fullDescription = description
    ? `${description}\n\nCreated via Jira by ${actorName} (${issueKey}).`
    : `Created via Jira by ${actorName} (${issueKey}).`;

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
          fullDescription
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

  if (results.some((r) => r.success)) {
    await postJiraComment(
      issueKey,
      `Feature flag "${name}" (${key}) was created by ${actorName} via the FeatBit-Jira integration.`
    );
    if (cfg.slackBotToken && cfg.slackChannelId) {
      const envNames = results.filter((r) => r.success).map((r) => r.envName);
      const blocks = buildFlagCreatedBlocks({
        name,
        key,
        actorName,
        issueKey,
        envNames,
        ...(cfg.portalUrl ? { portalUrl: cfg.portalUrl } : {}),
      });
      await sendSlackNotification(
        cfg.slackBotToken,
        cfg.slackChannelId,
        blocks,
        `Flag "${name}" created by ${actorName}`
      );
    }
  }

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

  const actorName = await getActorDisplayName(
    req.context?.accountId as string | undefined
  );

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
          await FeatBit.updateFlagTags(featbitCfg, env.id, flag.key, [
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

  if (results.some((r) => r.success)) {
    await postJiraComment(
      issueKey,
      `Feature flag "${flagKey}" was linked to this issue by ${actorName} via the FeatBit-Jira integration.`
    );
  }

  return { results };
});

// ── Toggle a flag on/off in one environment ──────────────────────────────────

resolver.define('toggleFlag', async (req) => {
  const { envId, flagKey, enable, issueKey } = req.payload as {
    envId: string;
    flagKey: string;
    enable: boolean;
    issueKey?: string;
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

    if (issueKey || (cfg.slackBotToken && cfg.slackChannelId)) {
      const actorName = await getActorDisplayName(
        req.context?.accountId as string | undefined
      );
      const action = enable ? 'enabled' : 'disabled';
      if (issueKey) {
        await postJiraComment(
          issueKey,
          `Feature flag "${flagKey}" was ${action} by ${actorName} via the FeatBit-Jira integration.`
        );
      }
      if (cfg.slackBotToken && cfg.slackChannelId) {
        const envName =
          cfg.environments.find((e) => e.id === envId)?.name ?? envId;
        const blocks = buildFlagToggledBlocks({
          flagKey,
          enable,
          actorName,
          envName,
          ...(issueKey ? { issueKey } : {}),
          ...(cfg.portalUrl ? { portalUrl: cfg.portalUrl } : {}),
        });
        await sendSlackNotification(
          cfg.slackBotToken,
          cfg.slackChannelId,
          blocks,
          `Flag "${flagKey}" ${action} by ${actorName}`
        );
      }
    }

    return { success: true };
  } catch (err) {
    return { error: String(err) };
  }
});

export const handler = resolver.getDefinitions();
