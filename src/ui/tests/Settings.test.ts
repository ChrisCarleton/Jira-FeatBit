import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount, flushPromises } from '@vue/test-utils';
import Settings from '../src/views/Settings.vue';
import ConfirmationDialog from '../src/components/ConfirmationDialog.vue';
import ToastMessage from '../src/components/ToastMessage.vue';
import * as api from '../src/api';
import type { StoredConfig } from '../src/types';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../src/api', () => ({
  getConfig: vi.fn(),
  fetchEnvironments: vi.fn(),
  saveConfig: vi.fn(),
  clearConfig: vi.fn(),
}));

const mockGetConfig = vi.mocked(api.getConfig);
const mockFetchEnvironments = vi.mocked(api.fetchEnvironments);
const mockSaveConfig = vi.mocked(api.saveConfig);
const mockClearConfig = vi.mocked(api.clearConfig);

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
  mockClearConfig.mockResolvedValue({ success: true });
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Settings', () => {
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
    const errorToast = wrapper
      .findAllComponents(ToastMessage)
      .find((c) => c.props('variant') === 'error');
    expect(errorToast?.props('message')).toContain(
      'Enter both the API URL and access token'
    );
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

  it('shows an error toast when fetchEnvironments returns an error', async () => {
    mockFetchEnvironments.mockResolvedValueOnce({ error: 'Invalid token' });
    const wrapper = shallowMount(Settings);
    await wrapper.find('input[type="url"]').setValue('http://featbit.local');
    await wrapper.find('input[type="password"]').setValue('bad-token');
    const btn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Test connection'));
    await btn!.trigger('click');
    await flushPromises();
    const errorToast = wrapper
      .findAllComponents(ToastMessage)
      .find((c) => c.props('variant') === 'error');
    expect(errorToast?.props('message')).toBe('Invalid token');
  });

  it('shows an error when Save is clicked without an API URL', async () => {
    const wrapper = shallowMount(Settings);
    const saveBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Save settings');
    await saveBtn!.trigger('click');
    expect(wrapper.text()).toContain('API URL is required');
  });

  it('shows the API URL error inline below the field', async () => {
    const wrapper = shallowMount(Settings);
    const saveBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Save settings');
    await saveBtn!.trigger('click');
    const urlInput = wrapper.find('input[type="url"]');
    const inlineError = urlInput.element.nextElementSibling;
    expect(inlineError?.tagName).toBe('P');
    expect(inlineError?.textContent).toContain('API URL is required');
  });

  it('applies !border-danger class to the API URL input when URL is empty on save', async () => {
    const wrapper = shallowMount(Settings);
    const saveBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Save settings');
    await saveBtn!.trigger('click');
    expect(wrapper.find('input[type="url"]').classes()).toContain(
      '!border-danger'
    );
  });

  it('does not call saveConfig when API URL is empty', async () => {
    const wrapper = shallowMount(Settings);
    const saveBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Save settings');
    await saveBtn!.trigger('click');
    expect(mockSaveConfig).not.toHaveBeenCalled();
  });

  it('clears the API URL error and saves after providing a valid URL', async () => {
    mockGetConfig.mockResolvedValueOnce(
      makeConfig({ apiUrl: '', hasToken: true, environments: twoEnvs })
    );
    const wrapper = shallowMount(Settings);
    await flushPromises();
    const saveBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Save settings');
    // Trigger validation error
    await saveBtn!.trigger('click');
    expect(mockSaveConfig).not.toHaveBeenCalled();
    // Fix the URL and save again
    await wrapper.find('input[type="url"]').setValue('http://featbit.local');
    await saveBtn!.trigger('click');
    await flushPromises();
    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ apiUrl: 'http://featbit.local' })
    );
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

  // ---------------------------------------------------------------------------
  // Reset settings
  // ---------------------------------------------------------------------------

  it('shows a ConfirmationDialog when Reset settings is clicked', async () => {
    const wrapper = shallowMount(Settings);
    const resetBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Reset settings');
    await resetBtn!.trigger('click');
    expect(wrapper.findComponent(ConfirmationDialog).exists()).toBe(true);
  });

  it('hides the ConfirmationDialog and does not call clearConfig when cancel is emitted', async () => {
    const wrapper = shallowMount(Settings);
    const resetBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Reset settings');
    await resetBtn!.trigger('click');
    await wrapper.findComponent(ConfirmationDialog).vm.$emit('cancel');
    expect(wrapper.findComponent(ConfirmationDialog).exists()).toBe(false);
    expect(mockClearConfig).not.toHaveBeenCalled();
  });

  it('calls clearConfig and clears form fields when confirm is emitted', async () => {
    mockGetConfig.mockResolvedValueOnce(
      makeConfig({
        apiUrl: 'http://featbit.local',
        hasToken: true,
        environments: twoEnvs,
      })
    );
    const wrapper = shallowMount(Settings);
    await flushPromises();
    const resetBtn = wrapper
      .findAll('button')
      .find((b) => b.text() === 'Reset settings');
    await resetBtn!.trigger('click');
    await wrapper.findComponent(ConfirmationDialog).vm.$emit('confirm');
    await flushPromises();
    expect(mockClearConfig).toHaveBeenCalled();
    // API URL input should be empty after reset
    expect(
      wrapper.find<HTMLInputElement>('input[type="url"]').element.value
    ).toBe('');
  });

  it('passes dangerous=true to ConfirmationDialog', async () => {
    const wrapper = shallowMount(Settings);
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Reset settings')!
      .trigger('click');
    const dialog = wrapper.findComponent(ConfirmationDialog);
    expect(dialog.props('dangerous')).toBe(true);
  });
});
