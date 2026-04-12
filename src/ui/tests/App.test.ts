import { describe, it, expect, vi, beforeEach } from 'vitest';
import { shallowMount, flushPromises } from '@vue/test-utils';
import App from '../src/App.vue';
import Settings from '../src/views/Settings.vue';
import IssuePanel from '../src/views/IssuePanel.vue';

const mockGetContext = vi.hoisted(() => vi.fn());

vi.mock('@forge/bridge', () => ({
  view: { getContext: mockGetContext },
}));

describe('App', () => {
  beforeEach(() => {
    mockGetContext.mockReset();
  });

  it('shows a loading indicator while context is pending', () => {
    mockGetContext.mockReturnValueOnce(new Promise(() => {})); // never resolves
    const wrapper = shallowMount(App);
    expect(wrapper.text()).toContain('Loading');
  });

  it('shows a context error when getContext rejects', async () => {
    mockGetContext.mockRejectedValueOnce(new Error('bridge failure'));
    const wrapper = shallowMount(App);
    await flushPromises();
    expect(wrapper.text()).toContain('Context error');
    expect(wrapper.text()).toContain('bridge failure');
  });

  it('renders Settings when moduleKey is "featbit-settings"', async () => {
    mockGetContext.mockResolvedValueOnce({ moduleKey: 'featbit-settings' });
    const wrapper = shallowMount(App);
    await flushPromises();
    expect(wrapper.findComponent(Settings).exists()).toBe(true);
    expect(wrapper.findComponent(IssuePanel).exists()).toBe(false);
  });

  it('renders IssuePanel for any other moduleKey', async () => {
    mockGetContext.mockResolvedValueOnce({ moduleKey: 'featbit-flags-panel' });
    const wrapper = shallowMount(App);
    await flushPromises();
    expect(wrapper.findComponent(IssuePanel).exists()).toBe(true);
    expect(wrapper.findComponent(Settings).exists()).toBe(false);
  });
});
