<script setup lang="ts">
defineProps<{
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  dangerous?: boolean;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('cancel');
}
</script>

<template>
  <div
    class="absolute inset-0 bg-[rgba(9,30,66,0.54)] flex items-center justify-center z-50"
    @click="emit('cancel')"
  >
    <div
      class="bg-surface-raised rounded w-[400px] max-w-[90vw] p-6 shadow-xl"
      role="alertdialog"
      aria-modal="true"
      @click.stop
      @keydown="handleKeyDown"
    >
      <h2 class="text-base font-bold text-text mb-3">{{ title }}</h2>
      <p class="text-sm text-text-subtle mb-6">{{ message }}</p>

      <div class="flex justify-end gap-2">
        <button
          class="px-4 py-1.5 bg-surface-overlay text-text border border-border rounded text-sm font-medium cursor-pointer"
          @click="emit('cancel')"
        >
          {{ cancelLabel ?? 'Cancel' }}
        </button>
        <button
          :class="[
            'px-4 py-1.5 border-0 rounded text-sm font-medium cursor-pointer',
            dangerous ? 'bg-danger text-white' : 'bg-accent text-white',
          ]"
          @click="emit('confirm')"
        >
          {{ confirmLabel ?? 'Confirm' }}
        </button>
      </div>
    </div>
  </div>
</template>
