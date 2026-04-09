<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { view } from '@forge/bridge';
import { getFlagsForIssue, toggleFlag } from '../api';
import type { Environment, FlagRow } from '../types';
import FlagTable from '../components/FlagTable.vue';
import CreateFlagModal from '../components/CreateFlagModal.vue';
import LinkFlagModal from '../components/LinkFlagModal.vue';
import ToastMessage from '../components/ToastMessage.vue';
import { useToast } from '../composables/useToast';

type Modal = 'create' | 'link' | null;

const issueKey = ref<string | null>(null);
const flags = ref<FlagRow[]>([]);
const environments = ref<Environment[]>([]);
const portalUrl = ref<string | undefined>(undefined);
const canCreateFlag = ref(true);
const readOnlyEnvIds = ref<string[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const toggling = ref(new Set<string>());
const modal = ref<Modal>(null);
const panelToast = useToast();

onMounted(() => {
  void view.getContext().then((ctx) => {
    const ext = ctx.extension as { issue?: { key?: string } } | undefined;
    issueKey.value = ext?.issue?.key ?? null;
  });
});

async function load(key: string) {
  loading.value = true;
  error.value = null;
  try {
    const res = await getFlagsForIssue(key);
    if (res.error) {
      error.value = res.error;
    } else {
      flags.value = res.flags ?? [];
      environments.value = res.environments ?? [];
      portalUrl.value = res.portalUrl || undefined;
      canCreateFlag.value = res.canCreateFlag !== false;
      readOnlyEnvIds.value = res.readOnlyEnvIds ?? [];
    }
  } catch (e) {
    error.value = String(e);
  } finally {
    loading.value = false;
  }
}

watch(issueKey, (key) => {
  if (key) void load(key);
});

function handleDone(msg?: string) {
  modal.value = null;
  if (issueKey.value) void load(issueKey.value);
  if (msg) panelToast.show(msg);
}

async function handleToggle(payload: {
  envId: string;
  flagKey: string;
  enable: boolean;
}) {
  const { envId, flagKey, enable } = payload;
  const key = `${envId}:${flagKey}`;
  if (toggling.value.has(key)) return;
  toggling.value.add(key);

  // Optimistic update
  flags.value = flags.value.map((f) => {
    if (f.key !== flagKey) return f;
    return {
      ...f,
      environments: f.environments.map((e) =>
        e.envId === envId ? { ...e, isEnabled: enable } : e
      ),
    };
  });

  const res = await toggleFlag({ envId, flagKey, enable, issueKey: issueKey.value ?? undefined });
  toggling.value.delete(key);

  if (res.error) {
    panelToast.show(`Toggle failed: ${res.error}`);
    if (issueKey.value) void load(issueKey.value);
  }
}
</script>

<template>
  <div
    v-if="!issueKey"
    class="px-4 py-3 border border-border rounded bg-surface text-text leading-relaxed"
  >
    Could not determine the current issue key.
  </div>

  <div v-else-if="loading" class="p-3 text-text-subtle">Loading flags…</div>

  <div
    v-else-if="error?.includes('not configured')"
    class="px-4 py-3 border border-border rounded bg-surface text-text leading-relaxed"
  >
    FeatBit is not configured.
    <strong>Open the FeatBit Settings global page</strong> to enter your API URL
    and access token.
  </div>

  <div
    v-else-if="error"
    class="px-4 py-3 border border-danger rounded bg-danger-bg text-danger leading-relaxed"
  >
    {{ error }}
  </div>

  <div
    v-else
    class="py-3"
    :style="{ position: 'relative', minHeight: modal ? '520px' : undefined }"
  >
    <ToastMessage
      :message="panelToast.message.value"
      :fading="panelToast.fading.value"
    />

    <div class="flex justify-between items-center mb-3">
      <span class="font-semibold text-sm text-text">
        {{ flags.length }} flag{{ flags.length !== 1 ? 's' : '' }} linked to
        {{ issueKey }}
      </span>
      <div class="flex gap-2">
        <button
          class="px-3 py-1 text-sm font-medium rounded border border-border bg-surface-overlay text-text cursor-pointer"
          @click="modal = 'link'"
        >
          Link existing flag
        </button>
        <button
          v-if="canCreateFlag"
          class="px-3 py-1 text-sm font-medium rounded border border-accent bg-accent text-white cursor-pointer"
          @click="modal = 'create'"
        >
          + Create flag
        </button>
      </div>
    </div>

    <div v-if="flags.length === 0" class="py-6 text-center text-text-subtle">
      <div>No feature flags linked to {{ issueKey }} yet.</div>
      <div class="mt-2 text-xs">
        Create a new flag or link an existing one tagged with
        <strong>{{ issueKey }}</strong
        >.
      </div>
    </div>
    <FlagTable
      v-else
      :flags="flags"
      :environments="environments"
      :portal-url="portalUrl"
      :toggling="toggling"
      :read-only-env-ids="readOnlyEnvIds"
      @toggle="handleToggle"
    />

    <CreateFlagModal
      v-if="modal === 'create'"
      :issue-key="issueKey"
      @close="modal = null"
      @done="handleDone"
    />
    <LinkFlagModal
      v-if="modal === 'link'"
      :issue-key="issueKey"
      @close="modal = null"
      @done="handleDone"
    />
  </div>
</template>
