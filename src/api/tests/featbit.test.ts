import * as FeatBit from '../src/featbit';

// ---------------------------------------------------------------------------
// fetch mock
// ---------------------------------------------------------------------------

const mockFetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;

beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockClear();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function fail(status: number, text = 'Server Error'): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(text),
  } as unknown as Response;
}

const cfg: FeatBit.FeatBitConfig = {
  apiUrl: 'http://localhost:5000',
  accessToken: 'test-token',
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

// ---------------------------------------------------------------------------
// listProjects
// ---------------------------------------------------------------------------

describe('listProjects', () => {
  it('sends the correct Authorization header', async () => {
    mockFetch.mockResolvedValueOnce(ok([]));
    await FeatBit.listProjects(cfg);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/projects'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'test-token',
        }),
      })
    );
  });

  it('returns projects from a direct array response', async () => {
    const projects: FeatBit.Project[] = [
      { id: 'p1', name: 'Project One', key: 'proj1', environments: [] },
    ];
    mockFetch.mockResolvedValueOnce(ok(projects));
    await expect(FeatBit.listProjects(cfg)).resolves.toEqual(projects);
  });

  it('returns projects from a { items } envelope response', async () => {
    const projects: FeatBit.Project[] = [
      { id: 'p1', name: 'Project One', key: 'proj1', environments: [] },
    ];
    mockFetch.mockResolvedValueOnce(ok({ items: projects }));
    await expect(FeatBit.listProjects(cfg)).resolves.toEqual(projects);
  });

  it('returns an empty array when items is absent from the envelope', async () => {
    mockFetch.mockResolvedValueOnce(ok({}));
    await expect(FeatBit.listProjects(cfg)).resolves.toEqual([]);
  });

  it('throws with status and body on a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(fail(401, 'Unauthorized'));
    await expect(FeatBit.listProjects(cfg)).rejects.toThrow(
      'FeatBit API 401: Unauthorized'
    );
  });
});

// ---------------------------------------------------------------------------
// listFlagsByTag
// ---------------------------------------------------------------------------

describe('listFlagsByTag', () => {
  const envId = 'env-abc';
  const tag = 'PROJ-42';

  it('calls the correct URL with tag and isArchived params', async () => {
    mockFetch.mockResolvedValueOnce(ok({ items: [], totalCount: 0 }));
    await FeatBit.listFlagsByTag(cfg, envId, tag);
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/envs/env-abc/feature-flags');
    expect(url).toContain('tags=PROJ-42');
    expect(url).toContain('isArchived=false');
  });

  it('URL-encodes the environment ID', async () => {
    mockFetch.mockResolvedValueOnce(ok({ items: [], totalCount: 0 }));
    await FeatBit.listFlagsByTag(cfg, 'env with spaces', tag);
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('env%20with%20spaces');
  });

  it('returns flags from the response', async () => {
    const flags = [makeFlag({ tags: [tag] })];
    mockFetch.mockResolvedValueOnce(ok({ items: flags, totalCount: 1 }));
    await expect(FeatBit.listFlagsByTag(cfg, envId, tag)).resolves.toEqual(
      flags
    );
  });

  it('returns an empty array when items is missing', async () => {
    mockFetch.mockResolvedValueOnce(ok({ totalCount: 0 }));
    await expect(FeatBit.listFlagsByTag(cfg, envId, tag)).resolves.toEqual([]);
  });

  it('throws on a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(fail(403, 'Forbidden'));
    await expect(FeatBit.listFlagsByTag(cfg, envId, tag)).rejects.toThrow(
      'FeatBit API 403: Forbidden'
    );
  });
});

// ---------------------------------------------------------------------------
// searchFlags
// ---------------------------------------------------------------------------

describe('searchFlags', () => {
  const envId = 'env-abc';

  it('calls the correct URL with Name and IsArchived params', async () => {
    mockFetch.mockResolvedValueOnce(ok({ items: [], totalCount: 0 }));
    await FeatBit.searchFlags(cfg, envId, 'my-feature');
    const url = (mockFetch.mock.calls[0] as [string, RequestInit])[0];
    expect(url).toContain('/api/v1/envs/env-abc/feature-flags');
    expect(url).toContain('name=my-feature');
    expect(url).toContain('isArchived=false');
  });

  it('returns matching flags', async () => {
    const flags = [makeFlag({ name: 'Search Result', key: 'search-result' })];
    mockFetch.mockResolvedValueOnce(ok({ items: flags, totalCount: 1 }));
    await expect(FeatBit.searchFlags(cfg, envId, 'search')).resolves.toEqual(
      flags
    );
  });

  it('returns an empty array when items is missing', async () => {
    mockFetch.mockResolvedValueOnce(ok({ totalCount: 0 }));
    await expect(FeatBit.searchFlags(cfg, envId, 'x')).resolves.toEqual([]);
  });

  it('throws on a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(fail(500, 'Internal Server Error'));
    await expect(FeatBit.searchFlags(cfg, envId, 'x')).rejects.toThrow('500');
  });
});

// ---------------------------------------------------------------------------
// createFlag
// ---------------------------------------------------------------------------

describe('createFlag', () => {
  const envId = 'env-abc';
  const createdFlag = makeFlag({
    id: 'new-id',
    name: 'New Flag',
    key: 'new-flag',
    tags: ['PROJ-1'],
  });

  it('sends a POST request to the correct URL', async () => {
    mockFetch.mockResolvedValueOnce(ok(createdFlag));
    await FeatBit.createFlag(cfg, envId, 'New Flag', 'new-flag', ['PROJ-1']);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:5000/api/v1/envs/env-abc/feature-flags');
    expect(init.method).toBe('POST');
  });

  it('includes name, key, tags and isEnabled:false in the request body', async () => {
    mockFetch.mockResolvedValueOnce(ok(createdFlag));
    await FeatBit.createFlag(cfg, envId, 'New Flag', 'new-flag', ['PROJ-1']);
    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string
    ) as Record<string, unknown>;
    expect(body).toMatchObject({
      name: 'New Flag',
      key: 'new-flag',
      tags: ['PROJ-1'],
      isEnabled: false,
    });
  });

  it('uses the boolean variation type', async () => {
    mockFetch.mockResolvedValueOnce(ok(createdFlag));
    await FeatBit.createFlag(cfg, envId, 'Flag', 'flag', []);
    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string
    ) as Record<string, unknown>;
    expect(body.variationType).toBe('boolean');
  });

  it('returns the created flag from the response body', async () => {
    mockFetch.mockResolvedValueOnce(ok(createdFlag));
    await expect(
      FeatBit.createFlag(cfg, envId, 'New Flag', 'new-flag', ['PROJ-1'])
    ).resolves.toEqual(createdFlag);
  });

  it('throws on a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(fail(409, 'Conflict'));
    await expect(
      FeatBit.createFlag(cfg, envId, 'Dup', 'dup', [])
    ).rejects.toThrow('FeatBit API 409: Conflict');
  });
});

// ---------------------------------------------------------------------------
// updateFlagTags
// ---------------------------------------------------------------------------

describe('updateFlagTags', () => {
  const envId = 'env-abc';
  const flagKey = 'my-flag-key';

  it('sends a PUT request to the tags endpoint using the flag key', async () => {
    mockFetch.mockResolvedValueOnce(ok(null));
    await FeatBit.updateFlagTags(cfg, envId, flagKey, ['PROJ-1', 'PROJ-2']);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      `http://localhost:5000/api/v1/envs/${envId}/feature-flags/${flagKey}/tags`
    );
    expect(init.method).toBe('PUT');
  });

  it('sends the tags as a plain JSON array (not wrapped in an object)', async () => {
    mockFetch.mockResolvedValueOnce(ok(null));
    await FeatBit.updateFlagTags(cfg, envId, flagKey, ['PROJ-1', 'PROJ-2']);
    const body = JSON.parse(
      (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string
    ) as unknown;
    expect(body).toEqual(['PROJ-1', 'PROJ-2']);
  });

  it('resolves with undefined on success', async () => {
    mockFetch.mockResolvedValueOnce(ok(null));
    await expect(
      FeatBit.updateFlagTags(cfg, envId, flagKey, [])
    ).resolves.toBeUndefined();
  });

  it('throws on a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce(fail(404, 'Not Found'));
    await expect(
      FeatBit.updateFlagTags(cfg, envId, flagKey, [])
    ).rejects.toThrow('FeatBit API 404: Not Found');
  });
});
