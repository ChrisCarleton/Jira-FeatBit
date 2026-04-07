import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import ToastMessage from '../src/components/ToastMessage.vue';

describe('ToastMessage', () => {
  it('renders nothing when message is null', () => {
    const wrapper = mount(ToastMessage, { props: { message: null } });
    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });

  it('renders the message text', () => {
    const wrapper = mount(ToastMessage, { props: { message: 'Saved!' } });
    expect(wrapper.text()).toContain('Saved!');
  });

  it('applies success (green) styles by default', () => {
    const wrapper = mount(ToastMessage, { props: { message: 'Done' } });
    expect(wrapper.find('[role="status"]').classes().join(' ')).toContain(
      'bg-success-bg'
    );
    expect(wrapper.find('[role="status"]').classes().join(' ')).toContain(
      'text-success'
    );
  });

  it('applies error (red) styles when variant is error', () => {
    const wrapper = mount(ToastMessage, {
      props: { message: 'Failed', variant: 'error' },
    });
    expect(wrapper.find('[role="status"]').classes().join(' ')).toContain(
      'bg-danger-bg'
    );
    expect(wrapper.find('[role="status"]').classes().join(' ')).toContain(
      'text-danger'
    );
  });

  it('applies animate-fade-out class when fading', () => {
    const wrapper = mount(ToastMessage, {
      props: { message: 'Bye', fading: true },
    });
    expect(wrapper.find('[role="status"]').classes()).toContain(
      'animate-fade-out'
    );
  });

  it('applies animate-fade-in class when not fading', () => {
    const wrapper = mount(ToastMessage, {
      props: { message: 'Hi', fading: false },
    });
    expect(wrapper.find('[role="status"]').classes()).toContain(
      'animate-fade-in'
    );
  });
});
