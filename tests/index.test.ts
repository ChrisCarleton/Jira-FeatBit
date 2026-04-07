// ---------------------------------------------------------------------------
// Module-level mocks — these are hoisted by jest before imports.
// Using `var` ensures the variable declaration is hoisted too, so the closures
// in the mock factories can write to `resolverHandlers` when index.ts is loaded.
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-var
var resolverHandlers: Record<
  string,
  (req: { payload: Record<string, unknown> }) => Promise<unknown>
> = {};

jest.mock('@forge/resolver', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    define: (
      name: string,
      fn: (req: { payload: Record<string, unknown> }) => Promise<unknown>
    ) => {
      resolverHandlers[name] = fn;
    },
    getDefinitions: jest.fn(() => ({})),
  })),
}));

jest.mock('@forge/api', () => ({
  __esModule: true,
  // Default export: the Jira API client
  default: {
    asApp: jest.fn(() => ({ requestJira: jest.fn() })),
  },
  // Named export: tagged-template URL builder (return interpolated string)
  route: jest.fn((strings: TemplateStringsArray, ...values: unknown[]) =>
    (strings as unknown as string[]).reduce(
      (acc, s, i) =>
        acc +
        s +
        (values[i] != null
          ? (values[i] as { toString(): string }).toString()
          : ''),
      ''
    )
  ),
}));

jest.mock('../src/featbit', () => ({
  listProjects: jest.fn(),
  listFlagsByTag: jest.fn(),
  searchFlags: jest.fn(),
  createFlag: jest.fn(),
  updateFlagTags: jest.fn(),
}));

jest.mock('@forge/kvs', () => ({
  kvs: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports — run after mocks are registered.
// Importing index.ts triggers all resolver.define() calls, populating
// `resolverHandlers` with the handler functions under test.
// ---------------------------------------------------------------------------

import api from '@forge/api';
import { kvs } from '@forge/kvs';
import * as FeatBit from '../src/featbit';
import '../src/index';

// ---------------------------------------------------------------------------
// Typed aliases for mocked dependencies
// ---------------------------------------------------------------------------

const mockKvsGet = kvs.get as jest.Mock;
const mockKvsSet = kvs.set as jest.Mock;
const mockFeatBit = FeatBit as jest.Mocked<typeof FeatBit>;
const mockApi = api as unknown as { asApp: jest.Mock };

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const storedConfig = {
  apiUrl: 'http://featbit.local',
  accessToken: 'secret-token',
  environments: [
    {
      id: 'env1',
      key: 'production',
      name: 'Production',
      projectId: 'p1',
      projectName: 'Default',
    },
    {
      id: 'env2',
      key: 'staging',
      name: 'Staging',
      projectId: 'p1',
      projectName: 'Default',
    },
  ],
};

const makeFlag = (
  overrides: Partial<FeatBit.FeatureFlag> = {}
): FeatBit.FeatureFlag => ({
  id: 'f1',
  name: 'My Flag',
  key: 'my-flag',
  isEnabled: true,
  isArchived: false,
  tags: [],
  variationType: 'boolean',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

/** Shorthand to invoke a captured resolver handler by name. */
function call(
  name: string,
  payload: Record<string, unknown> = {}
): Promise<unknown> {
  const handler = resolverHandlers[name];
  if (!handler) throw new Error(`Handler '${name}' was not registered`);
  return handler({ payload });
}

// ---------------------------------------------------------------------------
// Reset mocks and set up a sensible default for the Jira API before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  // Default: issue has no parent (fields = null → getParentEpicKey returns null)
  mockApi.asApp.mockReturnValue({
    requestJira: jest.fn().mockResolvedValue({
      json: () => Promise.resolve({ fields: null }),
    }),
  });
});

// ---------------------------------------------------------------------------
// getConfig
// ---------------------------------------------------------------------------

describe('getConfig', () => {
  it('returns null when no config has been saved', async () => {
    mockKvsGet.mockResolvedValueOnce(undefined);
    await expect(call('getConfig')).resolves.toBeNull();
  });

  it('returns hasToken:true and masks the access token', async () => {
    mockKvsGet.mockResolvedValueOnce(storedConfig);
    await expect(call('getConfig')).resolves.toEqual({
      apiUrl: storedConfig.apiUrl,
      hasToken: true,
      environments: storedConfig.environments,
    });
  });

  it('returns hasToken:false when the stored token is an empty string', async () => {
    mockKvsGet.mockResolvedValueOnce({ ...storedConfig, accessToken: '' });
    const result = (await call('getConfig')) as { hasToken: boolean };
    expect(result.hasToken).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// saveConfig
// ---------------------------------------------------------------------------

describe('saveConfig', () => {
  it('persists the payload to storage under the expected key', async () => {
    mockKvsSet.mockResolvedValueOnce(undefined);
    await call('saveConfig', {
      apiUrl: 'http://localhost:5000',
      accessToken: 'tok',
      environments: [],
    });
    expect(mockKvsSet).toHaveBeenCalledWith('featbit-config', {
      apiUrl: 'http://localhost:5000',
      accessToken: 'tok',
      environments: [],
      defaultEnvId: '',
      portalUrl: '',
    });
  });

  it('returns { success: true }', async () => {
    mockKvsSet.mockResolvedValueOnce(undefined);
    await expect(
      call('saveConfig', { apiUrl: '', accessToken: '', environments: [] })
    ).resolves.toEqual({ success: true });
  });

  it('preserves the existing token when an empty string is submitted', async () => {
    mockKvsGet.mockResolvedValueOnce({
      ...storedConfig,
      accessToken: 'old-token',
    });
    mockKvsSet.mockResolvedValueOnce(undefined);
    await call('saveConfig', {
      apiUrl: 'http://localhost:5000',
      accessToken: '',
      environments: [],
    });
    expect(mockKvsSet).toHaveBeenCalledWith(
      'featbit-config',
      expect.objectContaining({ accessToken: 'old-token' })
    );
  });
});

// ---------------------------------------------------------------------------
// fetchEnvironments
// ---------------------------------------------------------------------------

describe('fetchEnvironments', () => {
  it('returns flattened environments from all FeatBit projects', async () => {
    mockFeatBit.listProjects.mockResolvedValueOnce([
      {
        id: 'p1',
        name: 'Project Alpha',
        key: 'alpha',
        environments: [
          { id: 'e1', key: 'prod', name: 'Production' },
          { id: 'e2', key: 'dev', name: 'Dev' },
        ],
      },
      {
        id: 'p2',
        name: 'Project Beta',
        key: 'beta',
        environments: [{ id: 'e3', key: 'staging', name: 'Staging' }],
      },
    ]);
    await expect(
      call('fetchEnvironments', { apiUrl: 'http://x', accessToken: 'tok' })
    ).resolves.toEqual({
      environments: [
        {
          id: 'e1',
          key: 'prod',
          name: 'Production',
          projectId: 'p1',
          projectName: 'Project Alpha',
        },
        {
          id: 'e2',
          key: 'dev',
          name: 'Dev',
          projectId: 'p1',
          projectName: 'Project Alpha',
        },
        {
          id: 'e3',
          key: 'staging',
          name: 'Staging',
          projectId: 'p2',
          projectName: 'Project Beta',
        },
      ],
    });
  });

  it('returns { error } when the FeatBit client throws', async () => {
    mockFeatBit.listProjects.mockRejectedValueOnce(
      new Error('Connection refused')
    );
    const result = await call('fetchEnvironments', {
      apiUrl: '',
      accessToken: '',
    });
    expect(result).toEqual({ error: 'Error: Connection refused' });
  });

  it('returns { error } when listProjects returns an empty array', async () => {
    mockFeatBit.listProjects.mockResolvedValueOnce([]);
    const result = (await call('fetchEnvironments', {
      apiUrl: 'http://x',
      accessToken: 'tok',
    })) as { error: string };
    expect(result.error).toMatch(/no projects/i);
  });
});

// ---------------------------------------------------------------------------
// getFlagsForIssue
// ---------------------------------------------------------------------------

describe('getFlagsForIssue', () => {
  it('returns an error message when FeatBit is not configured', async () => {
    mockKvsGet.mockResolvedValueOnce(undefined);
    const result = (await call('getFlagsForIssue', { issueKey: 'PROJ-1' })) as {
      error: string;
    };
    expect(result.error).toMatch(/not configured/i);
  });

  it('queries each environment with the issue key tag', async () => {
    mockKvsGet.mockResolvedValueOnce(storedConfig);
    mockFeatBit.listFlagsByTag.mockResolvedValue([]);

    await call('getFlagsForIssue', { issueKey: 'PROJ-99' });

    expect(mockFeatBit.listFlagsByTag).toHaveBeenCalledWith(
      expect.objectContaining({ apiUrl: storedConfig.apiUrl }),
      'env1',
      'PROJ-99'
    );
    expect(mockFeatBit.listFlagsByTag).toHaveBeenCalledWith(
      expect.objectContaining({ apiUrl: storedConfig.apiUrl }),
      'env2',
      'PROJ-99'
    );
  });

  it('also queries with the parent epic tag when the issue has a parent', async () => {
    mockKvsGet.mockResolvedValueOnce(storedConfig);
    mockApi.asApp.mockReturnValue({
      requestJira: jest.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            fields: { issuetype: { name: 'Story' }, parent: { key: 'EPIC-5' } },
          }),
      }),
    });
    mockFeatBit.listFlagsByTag.mockResolvedValue([]);

    await call('getFlagsForIssue', { issueKey: 'PROJ-99' });

    expect(mockFeatBit.listFlagsByTag).toHaveBeenCalledWith(
      expect.anything(),
      'env1',
      'EPIC-5'
    );
    expect(mockFeatBit.listFlagsByTag).toHaveBeenCalledWith(
      expect.anything(),
      'env2',
      'EPIC-5'
    );
  });

  it('does not duplicate the tag query when the issue is itself an epic', async () => {
    mockKvsGet.mockResolvedValueOnce(storedConfig);
    mockApi.asApp.mockReturnValue({
      requestJira: jest.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            fields: { issuetype: { name: 'Epic' }, parent: null },
          }),
      }),
    });
    mockFeatBit.listFlagsByTag.mockResolvedValue([]);

    await call('getFlagsForIssue', { issueKey: 'EPIC-5' });

    // Only queried once per env — no second tag for the epic itself
    expect(mockFeatBit.listFlagsByTag).toHaveBeenCalledTimes(2); // 1 env × 1 tag × 2 envs
  });

  it('merges flags across environments into correctly shaped rows', async () => {
    const singleEnv = {
      id: 'env1',
      key: 'prod',
      name: 'Production',
      projectId: 'p1',
      projectName: 'Default',
    };
    mockKvsGet.mockResolvedValueOnce({
      ...storedConfig,
      environments: [singleEnv],
    });
    const flag = makeFlag({ isEnabled: true, tags: ['PROJ-1'] });
    mockFeatBit.listFlagsByTag.mockResolvedValue([flag]);

    const result = (await call('getFlagsForIssue', { issueKey: 'PROJ-1' })) as {
      flags: Array<{
        key: string;
        name: string;
        environments: Array<{ envId: string; isEnabled: boolean | null }>;
      }>;
      environments: unknown[];
    };

    expect(result.flags).toHaveLength(1);
    expect(result.flags[0]).toMatchObject({
      key: 'my-flag',
      name: 'My Flag',
      environments: [{ envId: 'env1', isEnabled: true }],
    });
    expect(result.environments).toEqual([singleEnv]);
  });

  it('de-duplicates flags that appear under multiple tags', async () => {
    mockKvsGet.mockResolvedValueOnce({
      ...storedConfig,
      environments: [
        {
          id: 'env1',
          key: 'prod',
          name: 'Production',
          projectId: 'p1',
          projectName: 'Default',
        },
      ],
    });
    mockApi.asApp.mockReturnValue({
      requestJira: jest.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            fields: { issuetype: { name: 'Story' }, parent: { key: 'EPIC-1' } },
          }),
      }),
    });
    const flag = makeFlag({ tags: ['PROJ-1', 'EPIC-1'] });
    // Flag returned for both the issue tag and the epic tag
    mockFeatBit.listFlagsByTag.mockResolvedValue([flag]);

    const result = (await call('getFlagsForIssue', { issueKey: 'PROJ-1' })) as {
      flags: unknown[];
    };

    expect(result.flags).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// searchFlags
// ---------------------------------------------------------------------------

describe('searchFlags', () => {
  it('returns an error when not configured', async () => {
    mockKvsGet.mockResolvedValueOnce(undefined);
    const result = (await call('searchFlags', { query: 'test' })) as {
      error: string;
    };
    expect(result.error).toMatch(/not configured/i);
  });

  it('returns an error when no environments are configured', async () => {
    mockKvsGet.mockResolvedValueOnce({ ...storedConfig, environments: [] });
    const result = (await call('searchFlags', { query: 'test' })) as {
      error: string;
    };
    expect(result.error).toMatch(/no environments/i);
  });

  it('searches all environments and deduplicates by key', async () => {
    mockKvsGet.mockResolvedValueOnce(storedConfig);
    const flags = [makeFlag({ name: 'Beta Feature', key: 'beta-feature' })];
    // env1 returns the flag; env2 returns the same flag (duplicate)
    mockFeatBit.searchFlags.mockResolvedValueOnce(flags);
    mockFeatBit.searchFlags.mockResolvedValueOnce(flags);

    const result = (await call('searchFlags', { query: 'beta' })) as {
      flags: unknown[];
    };

    expect(mockFeatBit.searchFlags).toHaveBeenCalledTimes(2);
    expect(mockFeatBit.searchFlags).toHaveBeenCalledWith(
      expect.anything(),
      'env1',
      'beta'
    );
    expect(mockFeatBit.searchFlags).toHaveBeenCalledWith(
      expect.anything(),
      'env2',
      'beta'
    );
    // Deduplicated — only one entry despite matching in both envs
    expect(result.flags).toHaveLength(1);
    expect(result.flags).toEqual(flags);
  });

  it('returns a flag found only in a non-primary environment', async () => {
    mockKvsGet.mockResolvedValueOnce(storedConfig);
    const flags = [makeFlag({ name: 'Beta Feature', key: 'beta-feature' })];
    // env1 returns nothing; env2 has the flag
    mockFeatBit.searchFlags.mockResolvedValueOnce([]);
    mockFeatBit.searchFlags.mockResolvedValueOnce(flags);

    const result = (await call('searchFlags', { query: 'beta' })) as {
      flags: unknown[];
    };
    expect(result.flags).toEqual(flags);
  });

  it('returns { error } when ALL environments throw', async () => {
    mockKvsGet.mockResolvedValueOnce(storedConfig);
    mockFeatBit.searchFlags.mockRejectedValue(new Error('Network error'));
    const result = (await call('searchFlags', { query: 'x' })) as {
      error: string;
    };
    expect(result.error).toMatch(/Network error/);
  });
});

// ---------------------------------------------------------------------------
// createFlag
// ---------------------------------------------------------------------------

describe('createFlag', () => {
  it('returns an error when not configured', async () => {
    mockKvsGet.mockResolvedValueOnce(undefined);
    const result = (await call('createFlag', {
      issueKey: 'PROJ-1',
      name: 'F',
      key: 'f',
    })) as { error: string };
    expect(result.error).toMatch(/not configured/i);
  });

  it('creates the flag in every configured environment', async () => {
    mockKvsGet.mockResolvedValueOnce(storedConfig);
    mockFeatBit.createFlag.mockResolvedValue(
      makeFlag({ name: 'New Flag', key: 'new-flag', tags: ['PROJ-1'] })
    );

    const result = (await call('createFlag', {
      issueKey: 'PROJ-1',
      name: 'New Flag',
      key: 'new-flag',
    })) as {
      results: Array<{ envId: string; envName: string; success: boolean }>;
    };

    expect(mockFeatBit.createFlag).toHaveBeenCalledTimes(2);
    expect(result.results).toEqual([
      { envId: 'env1', envName: 'Production', success: true },
      { envId: 'env2', envName: 'Staging', success: true },
    ]);
  });

  it('reports failure for environments where creation throws', async () => {
    mockKvsGet.mockResolvedValueOnce(storedConfig);
    mockFeatBit.createFlag
      .mockResolvedValueOnce(makeFlag())
      .mockRejectedValueOnce(new Error('Duplicate key'));

    const result = (await call('createFlag', {
      issueKey: 'PROJ-1',
      name: 'F',
      key: 'f',
    })) as { results: Array<{ success: boolean; error?: string }> };

    expect(result.results[0]?.success).toBe(true);
    expect(result.results[1]?.success).toBe(false);
    expect(result.results[1]?.error).toMatch(/Duplicate key/);
  });
});

// ---------------------------------------------------------------------------
// linkFlag
// ---------------------------------------------------------------------------

describe('linkFlag', () => {
  const existingFlag = makeFlag({
    id: 'flag-id',
    key: 'existing-flag',
    tags: [],
  });

  it('returns an error when not configured', async () => {
    mockKvsGet.mockResolvedValueOnce(undefined);
    const result = (await call('linkFlag', {
      issueKey: 'PROJ-1',
      flagKey: 'existing-flag',
    })) as { error: string };
    expect(result.error).toMatch(/not configured/i);
  });

  it('adds the issue key tag to the flag in each environment', async () => {
    mockKvsGet.mockResolvedValueOnce(storedConfig);
    mockFeatBit.searchFlags.mockResolvedValue([existingFlag]);
    mockFeatBit.updateFlagTags.mockResolvedValue(undefined);

    const result = (await call('linkFlag', {
      issueKey: 'PROJ-1',
      flagKey: 'existing-flag',
    })) as { results: Array<{ success: boolean }> };

    expect(mockFeatBit.updateFlagTags).toHaveBeenCalledWith(
      expect.anything(),
      'env1',
      'existing-flag',
      ['PROJ-1']
    );
    expect(result.results.every((r) => r.success)).toBe(true);
  });

  it('skips the tag update when the issue key is already present', async () => {
    mockKvsGet.mockResolvedValueOnce(storedConfig);
    const alreadyTagged = makeFlag({
      id: 'flag-id',
      key: 'existing-flag',
      tags: ['PROJ-1'],
    });
    mockFeatBit.searchFlags.mockResolvedValue([alreadyTagged]);

    await call('linkFlag', { issueKey: 'PROJ-1', flagKey: 'existing-flag' });

    expect(mockFeatBit.updateFlagTags).not.toHaveBeenCalled();
  });

  it('returns success:false when the flag is not found in an environment', async () => {
    mockKvsGet.mockResolvedValueOnce(storedConfig);
    mockFeatBit.searchFlags.mockResolvedValue([]); // flag absent

    const result = (await call('linkFlag', {
      issueKey: 'PROJ-1',
      flagKey: 'missing-flag',
    })) as { results: Array<{ success: boolean; error?: string }> };

    expect(result.results.every((r) => !r.success)).toBe(true);
    expect(result.results[0]?.error).toMatch(/not found/i);
  });
});
