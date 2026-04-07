import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import LinkFlagModal from '../src/components/LinkFlagModal.vue';
import * as api from '../src/api';

vi.mock('../src/api', () => ({
  searchFlags: vi.fn(),
  linkFlag: vi.fn(),
}));

const mockSearchFlags = vi.mocked(api.searchFlags);
const mockLinkFlag = vi.mocked(api.linkFlag);

function makeSearchFlag(overrides = {}) {
  return {
    id: 'f1',
    key: 'my-flag',
    name: 'My Flag',
    tags: [] as string[],
    isEnabled: true,
    ...overrides,
  };
}

function findButton(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('button').find((b) => b.text().trim() === label);
}

describe('LinkFlagModal', () => {
  beforeEach(() => {
    mockSearchFlags.mockReset();
    mockLinkFlag.mockReset();
  });

  it('renders a search input and Search button', () => {
    const wrapper = mount(LinkFlagModal, { props: { issueKey: 'PROJ-1' } });
    expect(wrapper.find('input[placeholder*="Search"]').exists()).toBe(true);
    expect(findButton(wrapper, 'Search')).toBeTruthy();
  });

  it('calls searchFlags with the trimmed query when Search is clicked', async () => {
    mockSearchFlags.mockResolvedValueOnce({ flags: [] });
    const wrapper = mount(LinkFlagModal, { props: { issueKey: 'PROJ-1' } });
    await wrapper.find('input').setValue('  my-feature  ');
    await findButton(wrapper, 'Search')!.trigger('click');
    await flushPromises();
    expect(mockSearchFlags).toHaveBeenCalledWith('my-feature');
  });

  it('shows returned flags as selectable items', async () => {
    mockSearchFlags.mockResolvedValueOnce({ flags: [makeSearchFlag()] });
    const wrapper = mount(LinkFlagModal, { props: { issueKey: 'PROJ-1' } });
    await wrapper.find('input').setValue('my');
    await findButton(wrapper, 'Search')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('My Flag');
    expect(wrapper.text()).toContain('my-flag');
  });

  it('shows "No flags found" when search returns empty', async () => {
    mockSearchFlags.mockResolvedValueOnce({ flags: [] });
    const wrapper = mount(LinkFlagModal, { props: { issueKey: 'PROJ-1' } });
    await wrapper.find('input').setValue('xyz');
    await findButton(wrapper, 'Search')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('No flags found');
  });

  it('shows an error returned from searchFlags', async () => {
    mockSearchFlags.mockResolvedValueOnce({ error: 'No environments configured.' });
    const wrapper = mount(LinkFlagModal, { props: { issueKey: 'PROJ-1' } });
    await wrapper.find('input').setValue('x');
    await findButton(wrapper, 'Search')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('No environments configured');
  });

  it('selects a flag when clicked and enables the Link flag button', async () => {
    mockSearchFlags.mockResolvedValueOnce({ flags: [makeSearchFlag()] });
    const wrapper = mount(LinkFlagModal, { props: { issueKey: 'PROJ-1' } });
    await wrapper.find('input').setValue('my');
    await findButton(wrapper, 'Search')!.trigger('click');
    await flushPromises();
    // Click the first result item
    await wrapper.find('[class*="transition-colors"]').trigger('click');
    const linkBtn = findButton(wrapper, 'Link flag');
    expect((linkBtn!.element as HTMLButtonElement).disabled).toBe(false);
  });

  it('calls linkFlag with the correct payload', async () => {
    mockSearchFlags.mockResolvedValueOnce({ flags: [makeSearchFlag()] });
    mockLinkFlag.mockResolvedValueOnce({ results: [{ envName: 'Prod', success: true }] });
    const wrapper = mount(LinkFlagModal, { props: { issueKey: 'PROJ-1' } });
    await wrapper.find('input').setValue('my');
    await findButton(wrapper, 'Search')!.trigger('click');
    await flushPromises();
    await wrapper.find('[class*="transition-colors"]').trigger('click');
    await findButton(wrapper, 'Link flag')!.trigger('click');
    await flushPromises();
    expect(mockLinkFlag).toHaveBeenCalledWith({ issueKey: 'PROJ-1', flagKey: 'my-flag' });
  });

  it('emits done with a success message after linking', async () => {
    mockSearchFlags.mockResolvedValueOnce({ flags: [makeSearchFlag()] });
    mockLinkFlag.mockResolvedValueOnce({ results: [{ envName: 'Prod', success: true }] });
    const wrapper = mount(LinkFlagModal, { props: { issueKey: 'PROJ-1' } });
    await wrapper.find('input').setValue('my');
    await findButton(wrapper, 'Search')!.trigger('click');
    await flushPromises();
    await wrapper.find('[class*="transition-colors"]').trigger('click');
    await findButton(wrapper, 'Link flag')!.trigger('click');
    await flushPromises();
    expect(wrapper.emitted('done')).toBeTruthy();
  });

  it('shows an error when linkFlag fails', async () => {
    mockSearchFlags.mockResolvedValueOnce({ flags: [makeSearchFlag()] });
    mockLinkFlag.mockResolvedValueOnce({ error: 'Network error' });
    const wrapper = mount(LinkFlagModal, { props: { issueKey: 'PROJ-1' } });
    await wrapper.find('input').setValue('my');
    await findButton(wrapper, 'Search')!.trigger('click');
    await flushPromises();
    await wrapper.find('[class*="transition-colors"]').trigger('click');
    await findButton(wrapper, 'Link flag')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Network error');
  });

  it('emits close when Cancel is clicked', async () => {
    const wrapper = mount(LinkFlagModal, { props: { issueKey: 'PROJ-1' } });
    await findButton(wrapper, 'Cancel')!.trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('emits close when Escape is pressed', async () => {
    const wrapper = mount(LinkFlagModal, { props: { issueKey: 'PROJ-1' } });
    // The keydown handler is on the search input
    await wrapper.find('input').trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
