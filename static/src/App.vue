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
    class="p-4 text-[#F15B50] border border-[#F15B50] rounded bg-[#3D1508] text-xs"
  >
    Context error: {{ ctxError }}
  </div>
  <div v-else-if="!moduleKey" class="p-4 text-[#8C9BAB]">Loading…</div>
  <Settings v-else-if="moduleKey === 'featbit-settings'" />
  <IssuePanel v-else />
</template>
