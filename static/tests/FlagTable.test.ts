import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import FlagTable from '../src/components/FlagTable.vue';
import type { Environment, FlagRow } from '../src/types';

vi.mock('@forge/bridge', () => ({
  router: {
    open: vi.fn(),
  },
}));

const environments: Environment[] = [
  { id: 'env1', key: 'prod', name: 'Production' },
  { id: 'env2', key: 'staging', name: 'Staging' },
];

function makeFlag(overrides: Partial<FlagRow> = {}): FlagRow {
  return {
    key: 'my-flag',
    name: 'My Flag',
    tags: ['PROJ-1'],
    environments: [
      { envId: 'env1', envName: 'Production', isEnabled: true, flagId: 'f1' },
      { envId: 'env2', envName: 'Staging', isEnabled: false, flagId: 'f2' },
    ],
    ...overrides,
  };
}

describe('FlagTable', () => {
  it('renders a column header for each environment', () => {
    const wrapper = mount(FlagTable, {
      props: { flags: [makeFlag()], environments },
    });
    expect(wrapper.text()).toContain('Production');
    expect(wrapper.text()).toContain('Staging');
  });

  it('renders a row for each flag', () => {
    const wrapper = mount(FlagTable, {
      props: {
        flags: [makeFlag(), makeFlag({ key: 'other', name: 'Other Flag' })],
        environments,
      },
    });
    expect(wrapper.text()).toContain('My Flag');
    expect(wrapper.text()).toContain('Other Flag');
  });

  it('displays the flag key in mono font', () => {
    const wrapper = mount(FlagTable, {
      props: { flags: [makeFlag()], environments },
    });
    expect(wrapper.text()).toContain('my-flag');
  });

  it('shows Enabled badge for enabled flags', () => {
    const wrapper = mount(FlagTable, {
      props: { flags: [makeFlag()], environments: [environments[0]!] },
    });
    expect(wrapper.text()).toContain('Enabled');
  });

  it('shows Disabled badge for disabled flags', () => {
    const wrapper = mount(FlagTable, {
      props: { flags: [makeFlag()], environments: [environments[1]!] },
    });
    expect(wrapper.text()).toContain('Disabled');
  });

  it('shows N/A when flag is absent from an environment', () => {
    const flagWithNull = makeFlag({
      environments: [
        { envId: 'env1', envName: 'Production', isEnabled: null, flagId: null },
      ],
    });
    const wrapper = mount(FlagTable, {
      props: { flags: [flagWithNull], environments: [environments[0]!] },
    });
    expect(wrapper.text()).toContain('N/A');
  });

  it('renders an empty table body when no flags are provided', () => {
    const wrapper = mount(FlagTable, {
      props: { flags: [], environments },
    });
    expect(wrapper.findAll('tbody tr')).toHaveLength(0);
  });

  it('emits toggle with enable:false when an Enabled button is clicked', async () => {
    const wrapper = mount(FlagTable, {
      props: { flags: [makeFlag()], environments: [environments[0]!] },
    });
    await wrapper.find('button[class*="rounded-full"]').trigger('click');
    const emitted = wrapper.emitted('toggle');
    expect(emitted).toBeTruthy();
    expect(emitted![0]![0]).toEqual({
      envId: 'env1',
      flagKey: 'my-flag',
      enable: false,
    });
  });

  it('emits toggle with enable:true when a Disabled button is clicked', async () => {
    const wrapper = mount(FlagTable, {
      props: { flags: [makeFlag()], environments: [environments[1]!] },
    });
    await wrapper.find('button[class*="rounded-full"]').trigger('click');
    const emitted = wrapper.emitted('toggle');
    expect(emitted).toBeTruthy();
    expect(emitted![0]![0]).toEqual({
      envId: 'env2',
      flagKey: 'my-flag',
      enable: true,
    });
  });

  it('renders N/A as a plain span with no toggle button', () => {
    const flagWithNull = makeFlag({
      environments: [
        { envId: 'env1', envName: 'Production', isEnabled: null, flagId: null },
      ],
    });
    const wrapper = mount(FlagTable, {
      props: { flags: [flagWithNull], environments: [environments[0]!] },
    });
    // Only the flag-name button exists; there should be no toggle button
    const buttons = wrapper.findAll('button[class*="rounded-full"]');
    expect(buttons).toHaveLength(0);
    expect(wrapper.text()).toContain('N/A');
  });

  it('disables the toggle button for a flag in the toggling set', () => {
    const wrapper = mount(FlagTable, {
      props: {
        flags: [makeFlag()],
        environments: [environments[0]!],
        toggling: new Set(['env1:my-flag']),
      },
    });
    const btn = wrapper.find<HTMLButtonElement>(
      'button[class*="rounded-full"]'
    );
    expect(btn.element.disabled).toBe(true);
  });

  it('renders flag name as a clickable button when portalUrl is provided', async () => {
    const { router } = await import('@forge/bridge');
    const wrapper = mount(FlagTable, {
      props: {
        flags: [makeFlag()],
        environments,
        portalUrl: 'https://featbit.example.com',
      },
    });
    const nameBtn = wrapper
      .findAll('button')
      .find((b) => b.text().includes('My Flag'));
    expect(nameBtn).toBeTruthy();
    await nameBtn!.trigger('click');
    expect(router.open).toHaveBeenCalledWith(
      'https://featbit.example.com/en/feature-flags/my-flag/targeting'
    );
  });
});
