<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { linkFlag, searchFlags } from '../api';
import type { SearchFlag } from '../types';

const props = defineProps<{
  issueKey: string;
}>();

const emit = defineEmits<{
  close: [];
  done: [msg?: string];
}>();

const query = ref('');
const results = ref<SearchFlag[]>([]);
const selected = ref<SearchFlag | null>(null);
const searching = ref(false);
const submitting = ref(false);
const searched = ref(false);
const error = ref<string | null>(null);
const searchInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
  searchInput.value?.focus();
});

async function handleSearch() {
  if (!query.value.trim()) return;
  searching.value = true;
  error.value = null;
  selected.value = null;
  const res = await searchFlags(query.value.trim());
  searching.value = false;
  searched.value = true;
  if (res.error) {
    error.value = res.error;
  } else {
    results.value = res.flags ?? [];
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') void handleSearch();
  if (e.key === 'Escape') emit('close');
}

async function handleLink() {
  if (!selected.value) return;
  submitting.value = true;
  error.value = null;
  const res = await linkFlag({
    issueKey: props.issueKey,
    flagKey: selected.value.key,
  });
  submitting.value = false;
  if (res.error) {
    error.value = res.error;
    return;
  }
  const failed = res.results?.filter((r) => !r.success) ?? [];
  if (failed.length > 0 && failed.length === (res.results?.length ?? 0)) {
    error.value = `Failed: ${failed.map((f) => `${f.envName} – ${f.error ?? 'unknown'}`).join('; ')}`;
  } else {
    emit('done', 'Flag linked successfully.');
  }
}
</script>

<template>
  <div
    class="absolute inset-0 bg-[rgba(9,30,66,0.54)] flex items-center justify-center z-50"
    @click="emit('close')"
  >
    <div
      class="bg-surface-raised rounded w-[480px] max-w-[90vw] p-6 shadow-xl"
      role="dialog"
      aria-modal="true"
      @click.stop
    >
      <h2 class="text-base font-bold text-text mb-4">Link existing flag</h2>
      <p class="text-xs text-text-subtle mb-4">
        Search for a feature flag and select it to tag it with
        <strong>{{ issueKey }}</strong
        >.
      </p>

      <div
        v-if="error"
        class="px-3 py-2 bg-danger-bg border border-danger rounded text-sm text-danger mb-3"
      >
        {{ error }}
      </div>

      <div class="flex gap-2 mb-3">
        <input
          ref="searchInput"
          v-model="query"
          class="flex-1 px-2.5 py-1.5 bg-surface border-2 border-border rounded text-sm text-text outline-none focus:border-link"
          type="text"
          placeholder="Search by flag name or key…"
          @keydown="handleKeyDown"
        />
        <button
          class="px-3.5 py-1.5 bg-surface-overlay text-text border border-border rounded text-sm font-medium cursor-pointer whitespace-nowrap disabled:opacity-50"
          :disabled="searching"
          @click="handleSearch"
        >
          {{ searching ? '…' : 'Search' }}
        </button>
      </div>

      <div
        class="max-h-60 overflow-y-auto border border-border rounded mb-3 bg-surface"
      >
        <div v-if="!searched" class="py-5 text-center text-text-subtle text-sm">
          Enter a search term above.
        </div>
        <div
          v-else-if="results.length === 0"
          class="py-5 text-center text-text-subtle text-sm"
        >
          No flags found. Try a different search term.
        </div>
        <div
          v-for="flag in results"
          :key="flag.key"
          class="px-3 py-2 cursor-pointer border-b border-surface-overlay last:border-0 transition-colors"
          :class="
            selected?.key === flag.key
              ? 'bg-surface-selected'
              : 'hover:bg-surface-overlay'
          "
          @click="selected = flag"
        >
          <div class="font-medium text-text text-sm">{{ flag.name }}</div>
          <div class="font-mono text-[11px] text-text-subtle">
            {{ flag.key }}
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2">
        <button
          class="px-4 py-1.5 bg-surface-overlay text-text border border-border rounded text-sm font-medium cursor-pointer disabled:opacity-50"
          :disabled="submitting"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          class="px-4 py-1.5 bg-accent text-white border-0 rounded text-sm font-medium cursor-pointer disabled:opacity-50"
          :class="{ 'opacity-50 cursor-not-allowed': !selected }"
          :disabled="!selected || submitting"
          @click="handleLink"
        >
          {{ submitting ? 'Linking…' : 'Link flag' }}
        </button>
      </div>
    </div>
  </div>
</template>
