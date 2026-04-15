import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ConfirmationDialog from '../src/components/ConfirmationDialog.vue';

const defaultProps = {
  title: 'Are you sure?',
  message: 'This action cannot be undone.',
};

describe('ConfirmationDialog', () => {
  it('renders the title and message', () => {
    const wrapper = mount(ConfirmationDialog, { props: defaultProps });
    expect(wrapper.text()).toContain('Are you sure?');
    expect(wrapper.text()).toContain('This action cannot be undone.');
  });

  it('uses default button labels when none are provided', () => {
    const wrapper = mount(ConfirmationDialog, { props: defaultProps });
    const buttons = wrapper.findAll('button');
    expect(buttons[0]!.text()).toBe('Cancel');
    expect(buttons[1]!.text()).toBe('Confirm');
  });

  it('uses custom button labels when provided', () => {
    const wrapper = mount(ConfirmationDialog, {
      props: {
        ...defaultProps,
        confirmLabel: 'Delete',
        cancelLabel: 'Go back',
      },
    });
    const buttons = wrapper.findAll('button');
    expect(buttons[0]!.text()).toBe('Go back');
    expect(buttons[1]!.text()).toBe('Delete');
  });

  it('applies bg-danger class to the confirm button when dangerous=true', () => {
    const wrapper = mount(ConfirmationDialog, {
      props: { ...defaultProps, dangerous: true },
    });
    expect(wrapper.findAll('button')[1]!.classes()).toContain('bg-danger');
  });

  it('applies bg-accent class to the confirm button when dangerous is not set', () => {
    const wrapper = mount(ConfirmationDialog, { props: defaultProps });
    expect(wrapper.findAll('button')[1]!.classes()).toContain('bg-accent');
  });

  it('emits confirm when the confirm button is clicked', async () => {
    const wrapper = mount(ConfirmationDialog, { props: defaultProps });
    await wrapper.findAll('button')[1]!.trigger('click');
    expect(wrapper.emitted('confirm')).toBeTruthy();
    expect(wrapper.emitted('cancel')).toBeFalsy();
  });

  it('emits cancel when the cancel button is clicked', async () => {
    const wrapper = mount(ConfirmationDialog, { props: defaultProps });
    await wrapper.findAll('button')[0]!.trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();
    expect(wrapper.emitted('confirm')).toBeFalsy();
  });

  it('emits cancel when the backdrop is clicked', async () => {
    const wrapper = mount(ConfirmationDialog, { props: defaultProps });
    // The outermost div is the backdrop
    await wrapper.find('div').trigger('click');
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('does not emit cancel when the inner dialog is clicked', async () => {
    const wrapper = mount(ConfirmationDialog, { props: defaultProps });
    await wrapper.find('[role="alertdialog"]').trigger('click');
    expect(wrapper.emitted('cancel')).toBeFalsy();
  });

  it('emits cancel when Escape is pressed', async () => {
    const wrapper = mount(ConfirmationDialog, { props: defaultProps });
    await wrapper
      .find('[role="alertdialog"]')
      .trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('cancel')).toBeTruthy();
  });

  it('does not emit cancel when an unrelated key is pressed', async () => {
    const wrapper = mount(ConfirmationDialog, { props: defaultProps });
    await wrapper
      .find('[role="alertdialog"]')
      .trigger('keydown', { key: 'Enter' });
    expect(wrapper.emitted('cancel')).toBeFalsy();
  });
});
