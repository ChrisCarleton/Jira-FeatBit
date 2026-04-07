<script setup lang="ts">
defineProps<{
  message: string | null;
  variant?: 'success' | 'error';
  fading?: boolean;
}>();
</script>

<template>
  <div
    v-if="message"
    class="px-3 py-2 rounded-lg text-xs mb-3"
    :class="[
      variant === 'error'
        ? 'bg-danger-bg border border-danger text-danger'
        : 'bg-success-bg border border-success text-success',
      fading ? 'animate-fade-out' : 'animate-fade-in',
    ]"
    role="status"
    aria-live="polite"
  >
    {{ message }}
  </div>
</template>
