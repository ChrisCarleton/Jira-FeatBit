import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount, flushPromises } from '@vue/test-utils';
import Settings from '../src/views/Settings.vue';
import * as api from '../src/api';
import type { StoredConfig } from '../src/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../src/api', () => ({
  getConfig: vi.fn(),
  fetchEnvironments: vi.fn(),
  saveConfig: vi.fn(),
}));

const mockGetConfig = vi.mocked(api.getConfig);
const mockFetchEnvironments = vi.mocked(api.fetchEnvironments);
const mockSaveConfig = vi.mocked(api.saveConfig);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<StoredConfig> = {}): StoredConfig {
  return {
    apiUrl: 'http://featbit.local',
    hasToken: false,
    environments: [],
    ...overrides,
  };
}

const twoEnvs = [
  {
    id: 'env1',
    key: 'prod',
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
];

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockGetConfig.mockResolvedValue(null);
  mockFetchEnvironments.mockResolvedValue({ environments: [] });
  mockSaveConfig.mockResolvedValue({ success: true });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Settings', () => {
  it('renders the page heading', () => {
    const wrapper = shallowMount(Settings);
    expect(wrapper.text()).toContain('FeatBit Settings');
  });

  it('pre-fills the API URL from stored config on mount', async () => {
    mockGetConfig.mockResolvedValueOnce(
      makeConfig({ apiUrl: 'http://my-featbit.com' })
    );
    const wrapper = shallowMount(Settings);
    await flushPromises();
    const input = wrapper.find<HTMLInputElement>('input[type="url"]');
    expect(input.element.value).toBe('http://my-featbit.com');
  });

  it('updates the token placeholder when hasToken is true', async () => {
    mockGetConfig.mockResolvedValueOnce(makeConfig({ hasToken: true }));
    const wrapper = shallowMount(Settings);
    await flushPromises();
    const passwordInputs = wrapper.findAll<HTMLInputElement>(
      'input[type="password"]'
    );
    const tokenInput = passwordInputs[0];
    expect(tokenInput!.element.placeholder).toContain('leave blank to keep');
  });

  it('shows an error when Fetch is clicked without an API URL', async () => {
    const wrapper = shallowMount(Settings);
    const btn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Test connection'));
    await btn!.trigger('click');
    expect(wrapper.text()).toContain('Enter both the API URL and access token');
  });

  it('calls fetchEnvironments with correct credentials and shows env count', async () => {
    mockFetchEnvironments.mockResolvedValueOnce({ environments: twoEnvs });
    const wrapper = shallowMount(Settings);
    await wrapper.find('input[type="url"]').setValue('http://featbit.local');
    await wrapper.find('input[type="password"]').setValue('my-token');
    const btn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Test connection'));
    await btn!.trigger('click');
    await flushPromises();
    expect(mockFetchEnvironments).toHaveBeenCalledWith({
      apiUrl: 'http://featbit.local',
      accessToken: 'my-token',
    });
    // The env table appears when environments are returned
    expect(wrapper.text()).toContain('Environments (2 found)');
  });

  it('shows a fetchError when fetchEnvironments returns an error', async () => {
    mockFetchEnvironments.mockResolvedValueOnce({ error: 'Invalid token' });
    const wrapper = shallowMount(Settings);
    await wrapper.find('input[type="url"]').setValue('http://featbit.local');
    await wrapper.find('input[type="password"]').setValue('bad-token');
    const btn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Test connection'));
    await btn!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Invalid token');
  });

  it('shows an error when Save is clicked without an API URL', async () => {
    const wrapper = shallowMount(Settings);
    const saveBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Save settings');
    await saveBtn!.trigger('click');
    expect(wrapper.text()).toContain('API URL is required');
  });

  it('calls saveConfig with the current form values', async () => {
    mockGetConfig.mockResolvedValueOnce(
      makeConfig({
        apiUrl: 'http://featbit.local',
        hasToken: true,
        environments: twoEnvs,
      })
    );
    const wrapper = shallowMount(Settings);
    await flushPromises();
    const saveBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Save settings');
    await saveBtn!.trigger('click');
    await flushPromises();
    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ apiUrl: 'http://featbit.local' })
    );
  });

  it('updates the environment display name when the name input changes', async () => {
    mockGetConfig.mockResolvedValueOnce(
      makeConfig({ apiUrl: 'http://x', hasToken: true, environments: twoEnvs })
    );
    const wrapper = shallowMount(Settings);
    await flushPromises();
    // Find the first env name input and change it
    const envInputs = wrapper.findAll<HTMLInputElement>(
      'input:not([type="url"]):not([type="password"]):not([type="checkbox"])'
    );
    await envInputs[0]!.setValue('Prod Renamed');
    const saveBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Save settings');
    await saveBtn!.trigger('click');
    await flushPromises();
    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        environments: expect.arrayContaining([
          expect.objectContaining({ name: 'Prod Renamed' }),
        ]),
      })
    );
  });

  it('renders environments from two projects with group headers', async () => {
    const multiProjectEnvs = [
      {
        id: 'env1',
        key: 'prod',
        name: 'Prod',
        projectId: 'p1',
        projectName: 'Alpha',
      },
      {
        id: 'env2',
        key: 'stg',
        name: 'Stg',
        projectId: 'p2',
        projectName: 'Beta',
      },
    ];
    mockGetConfig.mockResolvedValueOnce(
      makeConfig({
        apiUrl: 'http://x',
        hasToken: true,
        environments: multiProjectEnvs,
      })
    );
    const wrapper = shallowMount(Settings);
    await flushPromises();
    expect(wrapper.text()).toContain('Alpha');
    expect(wrapper.text()).toContain('Beta');
  });

  it('marks an environment as read-only when the checkbox is checked', async () => {
    mockGetConfig.mockResolvedValueOnce(
      makeConfig({ apiUrl: 'http://x', hasToken: true, environments: twoEnvs })
    );
    const wrapper = shallowMount(Settings);
    await flushPromises();
    const checkbox = wrapper.find<HTMLInputElement>('input[type="checkbox"]');
    await checkbox.setValue(true);
    const saveBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Save settings');
    await saveBtn!.trigger('click');
    await flushPromises();
    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        environments: expect.arrayContaining([
          expect.objectContaining({ readOnly: true }),
        ]),
      })
    );
  });
});
