import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@forge/bridge', () => ({
  invoke: vi.fn(),
}));

import { invoke } from '@forge/bridge';
import {
  getConfig,
  saveConfig,
  fetchEnvironments,
  getFlagsForIssue,
  searchFlags,
  createFlag,
  linkFlag,
  toggleFlag,
} from '../src/api';

const mockInvoke = vi.mocked(invoke);

beforeEach(() => {
  mockInvoke.mockReset();
  mockInvoke.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// getConfig
// ---------------------------------------------------------------------------

describe('getConfig', () => {
  it('calls invoke with "getConfig" and no extra payload', async () => {
    await getConfig();
    expect(mockInvoke).toHaveBeenCalledWith('getConfig');
  });
});

// ---------------------------------------------------------------------------
// saveConfig
// ---------------------------------------------------------------------------

describe('saveConfig', () => {
  it('calls invoke with "saveConfig" and the full payload', async () => {
    const payload = {
      apiUrl: 'http://featbit.local',
      accessToken: 'tok',
      environments: [],
    };
    await saveConfig(payload);
    expect(mockInvoke).toHaveBeenCalledWith('saveConfig', payload);
  });
});

// ---------------------------------------------------------------------------
// fetchEnvironments
// ---------------------------------------------------------------------------

describe('fetchEnvironments', () => {
  it('calls invoke with "fetchEnvironments" and credentials', async () => {
    const payload = { apiUrl: 'http://featbit.local', accessToken: 'tok' };
    await fetchEnvironments(payload);
    expect(mockInvoke).toHaveBeenCalledWith('fetchEnvironments', payload);
  });
});

// ---------------------------------------------------------------------------
// getFlagsForIssue
// ---------------------------------------------------------------------------

describe('getFlagsForIssue', () => {
  it('calls invoke with "getFlagsForIssue" wrapping the key in an object', async () => {
    await getFlagsForIssue('PROJ-1');
    expect(mockInvoke).toHaveBeenCalledWith('getFlagsForIssue', {
      issueKey: 'PROJ-1',
    });
  });
});

// ---------------------------------------------------------------------------
// searchFlags
// ---------------------------------------------------------------------------

describe('searchFlags', () => {
  it('calls invoke with "searchFlags" and the query wrapped in an object', async () => {
    await searchFlags('my feature');
    expect(mockInvoke).toHaveBeenCalledWith('searchFlags', {
      query: 'my feature',
    });
  });
});

// ---------------------------------------------------------------------------
// createFlag
// ---------------------------------------------------------------------------

describe('createFlag', () => {
  it('calls invoke with "createFlag" and the payload', async () => {
    const payload = {
      issueKey: 'PROJ-1',
      name: 'My Flag',
      key: 'my-flag',
      description: 'A description',
      createRetireTicket: false,
    };
    await createFlag(payload);
    expect(mockInvoke).toHaveBeenCalledWith('createFlag', payload);
  });
});

// ---------------------------------------------------------------------------
// linkFlag
// ---------------------------------------------------------------------------

describe('linkFlag', () => {
  it('calls invoke with "linkFlag" and the payload', async () => {
    const payload = { issueKey: 'PROJ-1', flagKey: 'my-flag' };
    await linkFlag(payload);
    expect(mockInvoke).toHaveBeenCalledWith('linkFlag', payload);
  });
});

// ---------------------------------------------------------------------------
// toggleFlag
// ---------------------------------------------------------------------------

describe('toggleFlag', () => {
  it('calls invoke with "toggleFlag" and the payload', async () => {
    const payload = {
      envId: 'env1',
      flagKey: 'my-flag',
      enable: true,
      issueKey: 'PROJ-1',
    };
    await toggleFlag(payload);
    expect(mockInvoke).toHaveBeenCalledWith('toggleFlag', payload);
  });
});
