import { ref } from 'vue';

const DISPLAY_MS = 3300;
const FADE_MS = 200;

export function useToast() {
  const message = ref<string | null>(null);
  const fading = ref(false);
  let timer: ReturnType<typeof setTimeout> | null = null;

  function show(msg: string) {
    if (timer) clearTimeout(timer);
    fading.value = false;
    message.value = msg;
    timer = setTimeout(() => {
      fading.value = true;
      setTimeout(() => {
        message.value = null;
        fading.value = false;
      }, FADE_MS);
    }, DISPLAY_MS);
  }

  function clear() {
    if (timer) clearTimeout(timer);
    message.value = null;
    fading.value = false;
  }

  return { message, fading, show, clear };
}
