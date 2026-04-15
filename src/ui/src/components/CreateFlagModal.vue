<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { createFlag } from '../api';
import { useVuelidate } from '@vuelidate/core';
import { helpers } from '@vuelidate/validators';

const trimRequired = (msg: string) =>
  helpers.withMessage(
    msg,
    (val: unknown) => String(val ?? '').trim().length > 0
  );

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
const createRetireTicket = ref(false);
const submitting = ref(false);
const error = ref<string | null>(null);
const nameInput = ref<HTMLInputElement | null>(null);

const v$ = useVuelidate(
  {
    name: { required: trimRequired('Flag name is required.') },
    key: { required: trimRequired('Flag key is required.') },
  },
  { name, key }
);

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
  v$.value.$touch();
  if (v$.value.$invalid) return;
  submitting.value = true;
  error.value = null;
  const res = await createFlag({
    issueKey: props.issueKey,
    name: name.value.trim(),
    key: key.value.trim(),
    description: description.value.trim(),
    createRetireTicket: createRetireTicket.value,
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
      class="bg-surface-raised rounded w-[440px] max-w-[90vw] p-6 shadow-xl"
      role="dialog"
      aria-modal="true"
      @click.stop
      @keydown="handleKeyDown"
    >
      <h2 class="text-base font-bold text-text mb-4">Create feature flag</h2>
      <p class="text-xs text-text-subtle mb-4">
        The flag will be created in all configured environments and tagged with
        <strong>{{ issueKey }}</strong
        >.
      </p>

      <div
        v-if="error"
        class="px-3 py-2 bg-danger-bg border border-danger rounded text-sm text-danger mb-3"
      >
        {{ error }}
      </div>

      <label class="block text-xs font-semibold text-text-subtle mb-1"
        >Flag name</label
      >
      <input
        ref="nameInput"
        :class="[
          'w-full px-2.5 py-1.5 bg-surface border-2 rounded text-sm text-text outline-none mb-1',
          v$.name.$error ? 'border-danger' : 'border-border focus:border-link',
        ]"
        type="text"
        :value="name"
        placeholder="e.g. My New Feature"
        @input="handleNameChange(($event.target as HTMLInputElement).value)"
      />
      <p v-if="v$.name.$error" class="mb-3 text-xs text-danger">
        {{ v$.name.$errors[0]?.$message }}
      </p>
      <div v-else class="mb-2" />

      <label class="block text-xs font-semibold text-text-subtle mb-1"
        >Flag key</label
      >
      <input
        :class="[
          'w-full px-2.5 py-1.5 bg-surface border-2 rounded text-sm text-text outline-none mb-1',
          v$.key.$error ? 'border-danger' : 'border-border focus:border-link',
        ]"
        type="text"
        :value="key"
        placeholder="e.g. my-new-feature"
        @input="handleKeyChange(($event.target as HTMLInputElement).value)"
      />
      <p v-if="v$.key.$error" class="mb-3 text-xs text-danger">
        {{ v$.key.$errors[0]?.$message }}
      </p>
      <div v-else class="mb-2" />

      <label class="block text-xs font-semibold text-text-subtle mb-1"
        >Description
        <span class="font-normal text-text-muted">(optional)</span></label
      >
      <textarea
        v-model="description"
        class="w-full px-2.5 py-1.5 bg-surface border-2 border-border rounded text-sm text-text outline-none focus:border-link mb-3 resize-none"
        rows="2"
        placeholder="What does this flag control?"
      />

      <label class="flex items-center gap-2 mb-4 cursor-pointer select-none">
        <input
          v-model="createRetireTicket"
          class="w-4 h-4 accent-accent cursor-pointer"
          type="checkbox"
        />
        <span class="text-sm text-text">Create ticket to retire flag</span>
      </label>

      <div class="flex justify-end gap-2 mt-2">
        <button
          class="px-4 py-1.5 bg-surface-overlay text-text border border-border rounded text-sm font-medium cursor-pointer disabled:opacity-50"
          :disabled="submitting"
          @click="emit('close')"
        >
          Cancel
        </button>
        <button
          class="px-4 py-1.5 bg-accent text-white border-0 rounded text-sm font-medium cursor-pointer disabled:opacity-50"
          :disabled="submitting"
          @click="handleSubmit"
        >
          {{ submitting ? 'Creating…' : 'Create flag' }}
        </button>
      </div>
    </div>
  </div>
</template>
