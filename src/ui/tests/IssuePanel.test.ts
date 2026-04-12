import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount, flushPromises } from '@vue/test-utils';
import IssuePanel from '../src/views/IssuePanel.vue';
import FlagTable from '../src/components/FlagTable.vue';
import CreateFlagModal from '../src/components/CreateFlagModal.vue';
import LinkFlagModal from '../src/components/LinkFlagModal.vue';
import * as api from '../src/api';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetContext = vi.hoisted(() => vi.fn());

vi.mock('@forge/bridge', () => ({
  view: { getContext: mockGetContext },
}));

vi.mock('../src/api', () => ({
  getFlagsForIssue: vi.fn(),
  toggleFlag: vi.fn(),
}));

const mockGetFlagsForIssue = vi.mocked(api.getFlagsForIssue);
const mockToggleFlag = vi.mocked(api.toggleFlag);

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const environments = [
  {
    id: 'env1',
    key: 'prod',
    name: 'Production',
    projectId: 'p1',
    projectName: 'Default',
  },
];

const makeFlag = (overrides = {}) => ({
  key: 'my-flag',
  name: 'My Flag',
  tags: ['PROJ-1'],
  environments: [
    { envId: 'env1', envName: 'Production', isEnabled: true, flagId: 'f1' },
  ],
  ...overrides,
});

/** Mount IssuePanel with context pre-resolved to the given issue key. */
async function mountWithIssue(issueKey: string | null) {
  mockGetContext.mockResolvedValueOnce({
    extension: issueKey ? { issue: { key: issueKey } } : undefined,
  });
  const wrapper = shallowMount(IssuePanel);
  await flushPromises();
  return wrapper;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockToggleFlag.mockResolvedValue({ success: true });
});

describe('IssuePanel', () => {
  it('shows a "no issue key" message when context contains no issue', async () => {
    const wrapper = await mountWithIssue(null);
    expect(wrapper.text()).toContain(
      'Could not determine the current issue key'
    );
  });

  it('shows a loading indicator while getFlagsForIssue is in flight', async () => {
    mockGetContext.mockResolvedValueOnce({
      extension: { issue: { key: 'PROJ-1' } },
    });
    // Never resolve
    mockGetFlagsForIssue.mockReturnValueOnce(new Promise(() => {}));
    const wrapper = shallowMount(IssuePanel);
    // Let getContext resolve but not getFlagsForIssue
    await flushPromises();
    expect(wrapper.text()).toContain('Loading flags');
  });

  it('shows a "not configured" message when the API returns that error', async () => {
    mockGetFlagsForIssue.mockResolvedValueOnce({
      error: 'FeatBit is not configured.',
    });
    const wrapper = await mountWithIssue('PROJ-1');
    expect(wrapper.text()).toContain('not configured');
  });

  it('shows a generic error message for other API errors', async () => {
    mockGetFlagsForIssue.mockResolvedValueOnce({ error: 'Connection refused' });
    const wrapper = await mountWithIssue('PROJ-1');
    expect(wrapper.text()).toContain('Connection refused');
  });

  it('renders the flag count and FlagTable when flags are returned', async () => {
    mockGetFlagsForIssue.mockResolvedValueOnce({
      flags: [makeFlag()],
      environments,
    });
    const wrapper = await mountWithIssue('PROJ-1');
    expect(wrapper.text()).toContain('1 flag linked to PROJ-1');
    expect(wrapper.findComponent(FlagTable).exists()).toBe(true);
  });

  it('shows plural "flags" when more than one flag is returned', async () => {
    mockGetFlagsForIssue.mockResolvedValueOnce({
      flags: [makeFlag(), makeFlag({ key: 'flag-2', name: 'Flag 2' })],
      environments,
    });
    const wrapper = await mountWithIssue('PROJ-1');
    expect(wrapper.text()).toContain('2 flags linked to PROJ-1');
  });

  it('shows an empty-state message when zero flags are returned', async () => {
    mockGetFlagsForIssue.mockResolvedValueOnce({ flags: [], environments });
    const wrapper = await mountWithIssue('PROJ-1');
    expect(wrapper.text()).toContain('No feature flags linked to PROJ-1');
  });

  it('hides the "Create flag" button when canCreateFlag is false', async () => {
    mockGetFlagsForIssue.mockResolvedValueOnce({
      flags: [],
      environments,
      canCreateFlag: false,
    });
    const wrapper = await mountWithIssue('PROJ-1');
    const createBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Create flag'));
    expect(createBtn).toBeUndefined();
  });

  it('opens the create modal when "+ Create flag" is clicked', async () => {
    mockGetFlagsForIssue.mockResolvedValueOnce({ flags: [], environments });
    const wrapper = await mountWithIssue('PROJ-1');
    const btn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Create flag'));
    await btn!.trigger('click');
    expect(wrapper.findComponent(CreateFlagModal).exists()).toBe(true);
  });

  it('opens the link modal when "Link existing flag" is clicked', async () => {
    mockGetFlagsForIssue.mockResolvedValueOnce({ flags: [], environments });
    const wrapper = await mountWithIssue('PROJ-1');
    const btn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Link existing flag'));
    await btn!.trigger('click');
    expect(wrapper.findComponent(LinkFlagModal).exists()).toBe(true);
  });

  it('closes the modal and reloads flags when the modal emits done', async () => {
    mockGetFlagsForIssue
      .mockResolvedValueOnce({ flags: [], environments })
      .mockResolvedValueOnce({ flags: [makeFlag()], environments });

    const wrapper = await mountWithIssue('PROJ-1');
    // Open create modal
    const btn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('Create flag'));
    await btn!.trigger('click');
    const modal = wrapper.findComponent(CreateFlagModal);
    await modal.vm.$emit('done');
    await flushPromises();

    // Modal should be gone and flags reloaded
    expect(wrapper.findComponent(CreateFlagModal).exists()).toBe(false);
    expect(mockGetFlagsForIssue).toHaveBeenCalledTimes(2);
  });

  it('calls toggleFlag and optimistically updates the flag state', async () => {
    mockGetFlagsForIssue.mockResolvedValueOnce({
      flags: [makeFlag()],
      environments,
    });
    const wrapper = await mountWithIssue('PROJ-1');

    // Emit a toggle event from the stubbed FlagTable
    const table = wrapper.findComponent(FlagTable);
    await table.vm.$emit('toggle', {
      envId: 'env1',
      flagKey: 'my-flag',
      enable: false,
    });
    await flushPromises();

    expect(mockToggleFlag).toHaveBeenCalledWith({
      envId: 'env1',
      flagKey: 'my-flag',
      enable: false,
      issueKey: 'PROJ-1',
    });
  });
});
