<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { fetchEnvironments, getConfig, saveConfig } from '../api';
import type { Environment } from '../types';
import ToastMessage from '../components/ToastMessage.vue';
import { useToast } from '../composables/useToast';

const apiUrl = ref('');
const accessToken = ref('');
const hasToken = ref(false);
const tokenPlaceholder = ref('Enter access token');
const environments = ref<Environment[]>([]);
const defaultEnvId = ref('');
const portalUrl = ref('');
const fetching = ref(false);
const saving = ref(false);
const fetchError = ref<string | null>(null);
const fetchToast = useToast();
const saveToast = useToast();

onMounted(() => {
  void getConfig().then((cfg) => {
    if (!cfg) return;
    apiUrl.value = cfg.apiUrl;
    environments.value = cfg.environments ?? [];
    defaultEnvId.value = cfg.defaultEnvId ?? '';
    portalUrl.value = cfg.portalUrl ?? '';
    if (cfg.hasToken) {
      hasToken.value = true;
      tokenPlaceholder.value = '(token saved – leave blank to keep)';
    }
  });
});

async function handleFetchEnvs() {
  const token = accessToken.value;
  if (!apiUrl.value || (!token && !hasToken.value)) {
    fetchError.value = 'Enter both the API URL and access token first.';
    return;
  }
  fetching.value = true;
  fetchError.value = null;
  fetchToast.clear();
  const res = await fetchEnvironments({
    apiUrl: apiUrl.value,
    accessToken: token,
  });
  fetching.value = false;
  if (res.error) {
    fetchError.value = res.error;
  } else {
    environments.value = res.environments ?? [];
    const count = res.environments?.length ?? 0;
    fetchToast.show(
      `Connection successful — ${count} environment${count !== 1 ? 's' : ''} loaded.`
    );
  }
}

async function handleSave() {
  if (!apiUrl.value) {
    saveToast.clear();
    fetchError.value = 'API URL is required.';
    return;
  }
  if (
    !accessToken.value &&
    !hasToken.value &&
    environments.value.length === 0
  ) {
    fetchError.value =
      'Fetch environments before saving, or provide an access token.';
    return;
  }
  saving.value = true;
  saveToast.clear();
  await saveConfig({
    apiUrl: apiUrl.value,
    accessToken: accessToken.value,
    environments: environments.value,
    defaultEnvId: defaultEnvId.value || undefined,
    portalUrl: portalUrl.value || undefined,
  });
  saving.value = false;
  saveToast.show('Settings saved successfully.');
  if (accessToken.value) {
    hasToken.value = true;
    tokenPlaceholder.value = '(token saved – leave blank to keep)';
  }
}

function handleEnvNameChange(id: string, name: string) {
  environments.value = environments.value.map((e) =>
    e.id === id ? { ...e, name } : e
  );
}

function handleEnvReadOnlyChange(id: string, readOnly: boolean) {
  environments.value = environments.value.map((e) =>
    e.id === id ? { ...e, readOnly } : e
  );
}

const projectGroups = computed(() => {
  const groups = new Map<
    string,
    { projectName: string; envs: Environment[] }
  >();
  for (const env of environments.value) {
    const pid = env.projectId ?? '';
    if (!groups.has(pid)) {
      groups.set(pid, { projectName: env.projectName ?? pid, envs: [] });
    }
    groups.get(pid)!.envs.push(env);
  }
  return Array.from(groups.values());
});

const inputCls =
  'w-full px-2.5 py-1.5 bg-surface border-2 border-border rounded text-sm text-text outline-none focus:border-link mb-3';
</script>

<template>
  <div class="p-5 max-w-xl">
    <h1 class="text-lg font-bold text-text mb-5">FeatBit Settings</h1>

    <div class="mb-6">
      <h2 class="text-sm font-semibold text-text mb-2">Connection</h2>

      <label class="block text-xs font-semibold text-text-subtle mb-1"
        >API Base URL</label
      >
      <input
        :class="inputCls"
        type="url"
        v-model="apiUrl"
        placeholder="https://your-featbit-instance.com:5000"
      />

      <label class="block text-xs font-semibold text-text-subtle mb-1"
        >Access Token</label
      >
      <input
        :class="inputCls"
        type="password"
        v-model="accessToken"
        :placeholder="tokenPlaceholder"
      />

      <label class="block text-xs font-semibold text-text-subtle mb-1"
        >Portal URL
        <span class="font-normal text-text-muted"
          >(optional — used for flag links)</span
        ></label
      >
      <input
        :class="inputCls"
        type="url"
        v-model="portalUrl"
        placeholder="http://localhost:8081"
      />

      <button
        class="px-4 py-1.5 bg-surface-overlay text-text border border-border rounded text-sm font-medium cursor-pointer disabled:opacity-50"
        @click="handleFetchEnvs"
        :disabled="fetching"
      >
        {{ fetching ? 'Loading…' : 'Test connection & load environments' }}
      </button>
    </div>

    <div
      v-if="fetchError"
      class="px-3.5 py-2.5 bg-danger-bg border border-danger rounded-lg text-xs text-danger mb-3 animate-fade-in"
    >
      {{ fetchError }}
    </div>

    <ToastMessage
      :message="fetchToast.message.value"
      :fading="fetchToast.fading.value"
    />

    <div v-if="environments.length > 0" class="mb-6">
      <h2 class="text-sm font-semibold text-text mb-2">
        Environments ({{ environments.length }} found)
      </h2>
      <p class="text-xs text-text-subtle mb-2">
        Rename environments if you'd like a shorter display name in the issue
        panel. Mark an environment as <strong>Read-only</strong> to prevent
        toggling flags from within Jira.
      </p>
      <table class="w-full border-collapse mt-2">
        <thead>
          <tr>
            <th
              class="text-left px-2 py-1.5 text-xs font-semibold text-text-subtle border-b-2 border-border"
            >
              Display Name
            </th>
            <th
              class="text-left px-2 py-1.5 text-xs font-semibold text-text-subtle border-b-2 border-border"
            >
              Key
            </th>
            <th
              class="text-left px-2 py-1.5 text-xs font-semibold text-text-subtle border-b-2 border-border"
            >
              ID
            </th>
            <th
              class="text-center px-2 py-1.5 text-xs font-semibold text-text-subtle border-b-2 border-border"
            >
              Read-only
            </th>
          </tr>
        </thead>
        <tbody>
          <template v-for="group in projectGroups" :key="group.projectName">
            <tr v-if="projectGroups.length > 1">
              <td
                colspan="4"
                class="px-2 py-1 text-[11px] font-bold text-text-subtle uppercase tracking-wider bg-surface-overlay border-b border-border"
              >
                {{ group.projectName }}
              </td>
            </tr>
            <tr v-for="env in group.envs" :key="env.id">
              <td
                class="px-2 py-1.5 text-sm border-b border-surface-overlay text-text"
              >
                <input
                  class="w-full px-2.5 py-1.5 bg-surface border-2 border-border rounded text-sm text-text outline-none focus:border-link"
                  :value="env.name"
                  @input="
                    handleEnvNameChange(
                      env.id,
                      ($event.target as HTMLInputElement).value
                    )
                  "
                />
              </td>
              <td
                class="px-2 py-1.5 text-sm border-b border-surface-overlay text-text"
              >
                <code class="text-xs">{{ env.key }}</code>
              </td>
              <td class="px-2 py-1.5 text-sm border-b border-surface-overlay">
                <code class="text-[11px] text-text-subtle">{{ env.id }}</code>
              </td>
              <td
                class="px-2 py-1.5 text-sm border-b border-surface-overlay text-center"
              >
                <input
                  type="checkbox"
                  class="accent-link w-4 h-4 cursor-pointer"
                  :checked="!!env.readOnly"
                  @change="
                    handleEnvReadOnlyChange(
                      env.id,
                      ($event.target as HTMLInputElement).checked
                    )
                  "
                />
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <div v-if="environments.length > 0" class="mb-6">
      <h2 class="text-sm font-semibold text-text mb-2">Default Environment</h2>
      <p class="text-xs text-text-subtle mb-2">
        Controls where new flags are created from the Jira issue panel. Choose
        <em>All environments</em> to create in every configured environment, a
        specific environment to create only there, or <em>None</em> to disable
        flag creation entirely.
      </p>
      <select :class="inputCls" v-model="defaultEnvId">
        <option value="">— All environments —</option>
        <option value="__none__">— None (disable flag creation) —</option>
        <template v-if="projectGroups.length === 1">
          <option v-for="env in environments" :key="env.id" :value="env.id">
            {{ env.name }}
          </option>
        </template>
        <template v-else>
          <optgroup
            v-for="group in projectGroups"
            :key="group.projectName"
            :label="group.projectName"
          >
            <option v-for="env in group.envs" :key="env.id" :value="env.id">
              {{ env.name }}
            </option>
          </optgroup>
        </template>
      </select>
    </div>

    <ToastMessage
      :message="saveToast.message.value"
      :fading="saveToast.fading.value"
    />

    <button
      class="px-4 py-1.5 bg-accent text-white border-0 rounded text-sm font-medium cursor-pointer disabled:opacity-50"
      @click="handleSave"
      :disabled="saving"
    >
      {{ saving ? 'Saving…' : 'Save settings' }}
    </button>
  </div>
</template>
