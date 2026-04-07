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
        ? 'bg-[#3D1508] border border-[#F15B50] text-[#F15B50]'
        : 'bg-[#1C3329] border border-[#4BCE97] text-[#4BCE97]',
      fading ? 'animate-fade-out' : 'animate-fade-in',
    ]"
    role="status"
    aria-live="polite"
  >
    {{ message }}
  </div>
</template>
