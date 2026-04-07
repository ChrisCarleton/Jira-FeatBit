<script setup lang="ts">
import { ref, onMounted } from 'vue';
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

const inputCls =
  'w-full px-2.5 py-1.5 bg-[#22272B] border-2 border-[#454F59] rounded text-sm text-[#B6C2CF] outline-none focus:border-[#579DFF] mb-3';
</script>

<template>
  <div class="p-5 max-w-xl">
    <h1 class="text-lg font-bold text-[#B6C2CF] mb-5">FeatBit Settings</h1>

    <div class="mb-6">
      <h2 class="text-sm font-semibold text-[#B6C2CF] mb-2">Connection</h2>

      <label class="block text-xs font-semibold text-[#8C9BAB] mb-1"
        >API Base URL</label
      >
      <input
        :class="inputCls"
        type="url"
        v-model="apiUrl"
        placeholder="https://your-featbit-instance.com:5000"
      />

      <label class="block text-xs font-semibold text-[#8C9BAB] mb-1"
        >Access Token</label
      >
      <input
        :class="inputCls"
        type="password"
        v-model="accessToken"
        :placeholder="tokenPlaceholder"
      />

      <label class="block text-xs font-semibold text-[#8C9BAB] mb-1"
        >Portal URL
        <span class="font-normal text-[#626F86]"
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
        class="px-4 py-1.5 bg-[#2C333A] text-[#B6C2CF] border border-[#454F59] rounded text-sm font-medium cursor-pointer disabled:opacity-50"
        @click="handleFetchEnvs"
        :disabled="fetching"
      >
        {{ fetching ? 'Loading…' : 'Test connection & load environments' }}
      </button>
    </div>

    <div
      v-if="fetchError"
      class="px-3.5 py-2.5 bg-[#3D1508] border border-[#F15B50] rounded-lg text-xs text-[#F15B50] mb-3 animate-fade-in"
    >
      {{ fetchError }}
    </div>

    <ToastMessage
      :message="fetchToast.message.value"
      :fading="fetchToast.fading.value"
    />

    <div v-if="environments.length > 0" class="mb-6">
      <h2 class="text-sm font-semibold text-[#B6C2CF] mb-2">
        Environments ({{ environments.length }} found)
      </h2>
      <p class="text-xs text-[#8C9BAB] mb-2">
        Rename environments if you'd like a shorter display name in the issue
        panel.
      </p>
      <table class="w-full border-collapse mt-2">
        <thead>
          <tr>
            <th
              class="text-left px-2 py-1.5 text-xs font-semibold text-[#8C9BAB] border-b-2 border-[#454F59]"
            >
              Display Name
            </th>
            <th
              class="text-left px-2 py-1.5 text-xs font-semibold text-[#8C9BAB] border-b-2 border-[#454F59]"
            >
              Key
            </th>
            <th
              class="text-left px-2 py-1.5 text-xs font-semibold text-[#8C9BAB] border-b-2 border-[#454F59]"
            >
              ID
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="env in environments" :key="env.id">
            <td
              class="px-2 py-1.5 text-sm border-b border-[#2C333A] text-[#B6C2CF]"
            >
              <input
                class="w-full px-2.5 py-1.5 bg-[#22272B] border-2 border-[#454F59] rounded text-sm text-[#B6C2CF] outline-none focus:border-[#579DFF]"
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
              class="px-2 py-1.5 text-sm border-b border-[#2C333A] text-[#B6C2CF]"
            >
              <code class="text-xs">{{ env.key }}</code>
            </td>
            <td class="px-2 py-1.5 text-sm border-b border-[#2C333A]">
              <code class="text-[11px] text-[#8C9BAB]">{{ env.id }}</code>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="environments.length > 0" class="mb-6">
      <h2 class="text-sm font-semibold text-[#B6C2CF] mb-2">
        Default Environment
      </h2>
      <p class="text-xs text-[#8C9BAB] mb-2">
        New flags will be created in this environment. If none is selected,
        flags are created in all environments.
      </p>
      <select :class="inputCls" v-model="defaultEnvId">
        <option value="">— All environments —</option>
        <option v-for="env in environments" :key="env.id" :value="env.id">
          {{ env.name }}
        </option>
      </select>
    </div>

    <ToastMessage
      :message="saveToast.message.value"
      :fading="saveToast.fading.value"
    />

    <button
      class="px-4 py-1.5 bg-[#0C66E4] text-white border-0 rounded text-sm font-medium cursor-pointer disabled:opacity-50"
      @click="handleSave"
      :disabled="saving"
    >
      {{ saving ? 'Saving…' : 'Save settings' }}
    </button>
  </div>
</template>
