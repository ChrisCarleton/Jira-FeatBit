<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createFlag } from '../api';

function nameToKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const props = defineProps<{
  issueKey: string;
}>();

const emit = defineEmits<{
  close: [];
  done: [msg?: string];
}>();

const name = ref('');
const key = ref('');
const description = ref('');
const keyEdited = ref(false);
const submitting = ref(false);
const error = ref<string | null>(null);
const nameInput = ref<HTMLInputElement | null>(null);

onMounted(() => {
  nameInput.value?.focus();
});

function handleNameChange(val: string) {
  name.value = val;
  if (!keyEdited.value) key.value = nameToKey(val);
}

function handleKeyChange(val: string) {
  key.value = val;
  keyEdited.value = true;
}

async function handleSubmit() {
  if (!name.value.trim()) {
    error.value = 'Flag name is required.';
    return;
  }
  if (!key.value.trim()) {
    error.value = 'Flag key is required.';
    return;
  }
  submitting.value = true;
  error.value = null;
  const res = await createFlag({
    issueKey: props.issueKey,
    name: name.value.trim(),
    key: key.value.trim(),
    description: description.value.trim(),
  });
  submitting.value = false;
  if (res.error) {
    error.value = res.error;
    return;
  }
  const failed = res.results?.filter((r) => !r.success) ?? [];
  if (failed.length > 0) {
    error.value = `Failed in: ${failed.map((f) => `${f.envName} – ${f.error ?? 'unknown error'}`).join('; ')}`;
  } else {
    emit('done', 'Feature flag created successfully.');
  }
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') void handleSubmit();
  if (e.key === 'Escape') emit('close');
}
</script>

<template>
  <div
    class="absolute inset-0 bg-[rgba(9,30,66,0.54)] flex items-center justify-center z-50"
    @click="emit('close')"
  >
    <div
      class="bg-[#282E33] rounded w-[440px] max-w-[90vw] p-6 shadow-xl"
      @click.stop
      @keydown="handleKeyDown"
      role="dialog"
      aria-modal="true"
    >
      <h2 class="text-base font-bold text-[#B6C2CF] mb-4">
        Create feature flag
      </h2>
      <p class="text-xs text-[#8C9BAB] mb-4">
        The flag will be created in all configured environments and tagged with
        <strong>{{ issueKey }}</strong
        >.
      </p>

      <div
        v-if="error"
        class="px-3 py-2 bg-[#3D1508] border border-[#F15B50] rounded text-sm text-[#F15B50] mb-3"
      >
        {{ error }}
      </div>

      <label class="block text-xs font-semibold text-[#8C9BAB] mb-1"
        >Flag name</label
      >
      <input
        ref="nameInput"
        class="w-full px-2.5 py-1.5 bg-[#22272B] border-2 border-[#454F59] rounded text-sm text-[#B6C2CF] outline-none focus:border-[#579DFF] mb-3"
        type="text"
        :value="name"
        @input="handleNameChange(($event.target as HTMLInputElement).value)"
        placeholder="e.g. My New Feature"
      />

      <label class="block text-xs font-semibold text-[#8C9BAB] mb-1"
        >Flag key</label
      >
      <input
        class="w-full px-2.5 py-1.5 bg-[#22272B] border-2 border-[#454F59] rounded text-sm text-[#B6C2CF] outline-none focus:border-[#579DFF] mb-3"
        type="text"
        :value="key"
        @input="handleKeyChange(($event.target as HTMLInputElement).value)"
        placeholder="e.g. my-new-feature"
      />

      <label class="block text-xs font-semibold text-[#8C9BAB] mb-1"
        >Description
        <span class="font-normal text-[#626F86]">(optional)</span></label
      >
      <textarea
        class="w-full px-2.5 py-1.5 bg-[#22272B] border-2 border-[#454F59] rounded text-sm text-[#B6C2CF] outline-none focus:border-[#579DFF] mb-3 resize-none"
        rows="2"
        v-model="description"
        placeholder="What does this flag control?"
      />

      <div class="flex justify-end gap-2 mt-2">
        <button
          class="px-4 py-1.5 bg-[#2C333A] text-[#B6C2CF] border border-[#454F59] rounded text-sm font-medium cursor-pointer disabled:opacity-50"
          @click="emit('close')"
          :disabled="submitting"
        >
          Cancel
        </button>
        <button
          class="px-4 py-1.5 bg-[#0C66E4] text-white border-0 rounded text-sm font-medium cursor-pointer disabled:opacity-50"
          @click="handleSubmit"
          :disabled="submitting"
        >
          {{ submitting ? 'Creating…' : 'Create flag' }}
        </button>
      </div>
    </div>
  </div>
</template>
