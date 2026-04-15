import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import CreateFlagModal from '../src/components/CreateFlagModal.vue';
import * as api from '../src/api';

vi.mock('../src/api', () => ({
  createFlag: vi.fn(),
}));

const mockCreateFlag = vi.mocked(api.createFlag);

function findButton(wrapper: ReturnType<typeof mount>, label: string) {
  return wrapper.findAll('button').find((b) => b.text().trim() === label);
}

describe('CreateFlagModal', () => {
  beforeEach(() => {
    mockCreateFlag.mockReset();
  });

  it('auto-generates a slug key from the flag name', async () => {
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    const nameInput = wrapper.find<HTMLInputElement>(
      'input[placeholder*="My New Feature"]'
    );
    await nameInput.setValue('Hello World Feature');
    const keyInput = wrapper.find<HTMLInputElement>(
      'input[placeholder*="my-new-feature"]'
    );
    expect(keyInput.element.value).toBe('hello-world-feature');
  });

  it('does not overwrite a manually-edited key', async () => {
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    const keyInput = wrapper.find<HTMLInputElement>(
      'input[placeholder*="my-new-feature"]'
    );
    await keyInput.setValue('custom-key');
    await wrapper
      .find('input[placeholder*="My New Feature"]')
      .setValue('Another Name');
    expect(keyInput.element.value).toBe('custom-key');
  });

  it('shows an error when submitted with no name', async () => {
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    await findButton(wrapper, 'Create flag')!.trigger('click');
    expect(wrapper.text()).toContain('Flag name is required');
  });

  it('shows the name error inline below the name field, not the API error banner', async () => {
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    await findButton(wrapper, 'Create flag')!.trigger('click');
    // Inline <p> error is rendered immediately after the name input
    const nameSection = wrapper.find('input[placeholder*="My New Feature"]');
    const inlineError = nameSection.element.nextElementSibling;
    expect(inlineError?.tagName).toBe('P');
    expect(inlineError?.textContent).toContain('Flag name is required');
    // The shared API error banner (first div with error class) should be absent
    const banner = wrapper.find('.bg-danger-bg');
    expect(banner.exists()).toBe(false);
  });

  it('applies border-danger class to the name input when name is missing on submit', async () => {
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    await findButton(wrapper, 'Create flag')!.trigger('click');
    expect(
      wrapper.find('input[placeholder*="My New Feature"]').classes()
    ).toContain('border-danger');
  });

  it('does not call createFlag when name validation fails', async () => {
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    await findButton(wrapper, 'Create flag')!.trigger('click');
    expect(mockCreateFlag).not.toHaveBeenCalled();
  });

  it('shows an error when submitted with no key', async () => {
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    // Set name then clear the auto-generated key
    await wrapper
      .find<HTMLInputElement>('input[placeholder*="My New Feature"]')
      .setValue('My Flag');
    const keyInput = wrapper.find<HTMLInputElement>(
      'input[placeholder*="my-new-feature"]'
    );
    await keyInput.setValue('');
    await findButton(wrapper, 'Create flag')!.trigger('click');
    expect(wrapper.text()).toContain('Flag key is required');
  });

  it('applies border-danger class to the key input when key is cleared on submit', async () => {
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    await wrapper
      .find<HTMLInputElement>('input[placeholder*="My New Feature"]')
      .setValue('My Flag');
    await wrapper
      .find<HTMLInputElement>('input[placeholder*="my-new-feature"]')
      .setValue('');
    await findButton(wrapper, 'Create flag')!.trigger('click');
    expect(
      wrapper.find('input[placeholder*="my-new-feature"]').classes()
    ).toContain('border-danger');
  });

  it('does not call createFlag when key validation fails', async () => {
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    await wrapper
      .find<HTMLInputElement>('input[placeholder*="My New Feature"]')
      .setValue('My Flag');
    await wrapper
      .find<HTMLInputElement>('input[placeholder*="my-new-feature"]')
      .setValue('');
    await findButton(wrapper, 'Create flag')!.trigger('click');
    expect(mockCreateFlag).not.toHaveBeenCalled();
  });

  it('clears validation errors and submits after fixing an invalid field', async () => {
    mockCreateFlag.mockResolvedValueOnce({
      results: [{ envName: 'Prod', success: true }],
    });
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    // Trigger validation errors
    await findButton(wrapper, 'Create flag')!.trigger('click');
    expect(wrapper.text()).toContain('Flag name is required');
    // Now fill in the required fields and re-submit
    await wrapper
      .find('input[placeholder*="My New Feature"]')
      .setValue('Valid Flag');
    await findButton(wrapper, 'Create flag')!.trigger('click');
    await flushPromises();
    expect(mockCreateFlag).toHaveBeenCalled();
    expect(wrapper.emitted('done')).toBeTruthy();
  });

  it('calls createFlag with the correct payload on submit', async () => {
    mockCreateFlag.mockResolvedValueOnce({
      results: [{ envName: 'Prod', success: true }],
    });
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'SCRUM-1' } });
    await wrapper
      .find('input[placeholder*="My New Feature"]')
      .setValue('New Flag');
    await findButton(wrapper, 'Create flag')!.trigger('click');
    await flushPromises();
    expect(mockCreateFlag).toHaveBeenCalledWith({
      issueKey: 'SCRUM-1',
      name: 'New Flag',
      key: 'new-flag',
      description: '',
      createRetireTicket: false,
    });
  });

  it('emits done with a success message when creation succeeds', async () => {
    mockCreateFlag.mockResolvedValueOnce({
      results: [{ envName: 'Prod', success: true }],
    });
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    await wrapper
      .find('input[placeholder*="My New Feature"]')
      .setValue('My Flag');
    await findButton(wrapper, 'Create flag')!.trigger('click');
    await flushPromises();
    expect(wrapper.emitted('done')).toBeTruthy();
  });

  it('shows an error returned from the API', async () => {
    mockCreateFlag.mockResolvedValueOnce({
      error: 'No environments configured.',
    });
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    await wrapper
      .find('input[placeholder*="My New Feature"]')
      .setValue('My Flag');
    await findButton(wrapper, 'Create flag')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('No environments configured');
  });

  it('shows per-environment failures when some environments fail', async () => {
    mockCreateFlag.mockResolvedValueOnce({
      results: [
        { envName: 'Prod', success: true },
        { envName: 'Staging', success: false, error: 'Duplicate key' },
      ],
    });
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    await wrapper
      .find('input[placeholder*="My New Feature"]')
      .setValue('My Flag');
    await findButton(wrapper, 'Create flag')!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).toContain('Staging');
    expect(wrapper.text()).toContain('Duplicate key');
  });

  it('passes createRetireTicket: true when checkbox is checked', async () => {
    mockCreateFlag.mockResolvedValueOnce({
      results: [{ envName: 'Prod', success: true }],
    });
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    await wrapper
      .find('input[placeholder*="My New Feature"]')
      .setValue('My Flag');
    await wrapper.find('input[type="checkbox"]').setValue(true);
    await findButton(wrapper, 'Create flag')!.trigger('click');
    await flushPromises();
    expect(mockCreateFlag).toHaveBeenCalledWith({
      issueKey: 'PROJ-1',
      name: 'My Flag',
      key: 'my-flag',
      description: '',
      createRetireTicket: true,
    });
  });

  it('submits the form when Enter is pressed on the dialog', async () => {
    mockCreateFlag.mockResolvedValueOnce({
      results: [{ envName: 'Prod', success: true }],
    });
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    await wrapper
      .find('input[placeholder*="My New Feature"]')
      .setValue('My Flag');
    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Enter' });
    await flushPromises();
    expect(mockCreateFlag).toHaveBeenCalled();
    expect(wrapper.emitted('done')).toBeTruthy();
  });

  it('emits close when Cancel is clicked', async () => {
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    await findButton(wrapper, 'Cancel')!.trigger('click');
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('emits close when Escape is pressed', async () => {
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    // The keydown handler is on the inner dialog div
    await wrapper.find('[role="dialog"]').trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('includes description in the payload when filled in', async () => {
    mockCreateFlag.mockResolvedValueOnce({
      results: [{ envName: 'Prod', success: true }],
    });
    const wrapper = mount(CreateFlagModal, { props: { issueKey: 'PROJ-1' } });
    await wrapper
      .find('input[placeholder*="My New Feature"]')
      .setValue('My Flag');
    await wrapper
      .find('textarea[placeholder*="What does this flag"]')
      .setValue('A helpful description');
    await findButton(wrapper, 'Create flag')!.trigger('click');
    await flushPromises();
    expect(mockCreateFlag).toHaveBeenCalledWith({
      issueKey: 'PROJ-1',
      name: 'My Flag',
      key: 'my-flag',
      description: 'A helpful description',
      createRetireTicket: false,
    });
  });
});
