<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { view } from '@forge/bridge';
import IssuePanel from './views/IssuePanel.vue';
import Settings from './views/Settings.vue';

const moduleKey = ref<string | null>(null);
const ctxError = ref<string | null>(null);

onMounted(() => {
  view
    .getContext()
    .then((ctx) => {
      moduleKey.value = ctx.moduleKey;
    })
    .catch((err: unknown) => {
      ctxError.value = String(err);
    });
});
</script>

<template>
  <div
    v-if="ctxError"
    class="p-4 text-danger border border-danger rounded bg-danger-bg text-xs"
  >
    Context error: {{ ctxError }}
  </div>
  <div v-else-if="!moduleKey" class="p-4 text-text-subtle">Loading…</div>
  <Settings v-else-if="moduleKey === 'featbit-settings'" />
  <IssuePanel v-else />
</template>
