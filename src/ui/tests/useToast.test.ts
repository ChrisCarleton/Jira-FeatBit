import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useToast } from '../src/composables/useToast';

const DISPLAY_MS = 3300;
const FADE_MS = 200;

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with message null and fading false', () => {
    const { message, fading } = useToast();
    expect(message.value).toBeNull();
    expect(fading.value).toBe(false);
  });

  it('show() sets the message immediately', () => {
    const { message, show } = useToast();
    show('Hello!');
    expect(message.value).toBe('Hello!');
    expect; // message is visible right away
  });

  it('show() sets fading to false when called', () => {
    const { fading, show } = useToast();
    show('Test');
    expect(fading.value).toBe(false);
  });

  it('fading becomes true after DISPLAY_MS', () => {
    const { fading, show } = useToast();
    show('Test');
    vi.advanceTimersByTime(DISPLAY_MS);
    expect(fading.value).toBe(true);
  });

  it('message is cleared and fading resets after DISPLAY_MS + FADE_MS', () => {
    const { message, fading, show } = useToast();
    show('Test');
    vi.advanceTimersByTime(DISPLAY_MS + FADE_MS);
    expect(message.value).toBeNull();
    expect(fading.value).toBe(false);
  });

  it('calling show() again resets the timer and keeps the new message', () => {
    const { message, fading, show } = useToast();
    show('First');
    vi.advanceTimersByTime(1000);
    show('Second');
    expect(message.value).toBe('Second');
    // "Second"'s timer fires DISPLAY_MS after it was shown; advance to 1ms before
    vi.advanceTimersByTime(DISPLAY_MS - 1);
    expect(fading.value).toBe(false);
    // Now the timer fires
    vi.advanceTimersByTime(1);
    expect(fading.value).toBe(true);
  });

  it('clear() resets message and fading immediately', () => {
    const { message, fading, show, clear } = useToast();
    show('Hi');
    clear();
    expect(message.value).toBeNull();
    expect(fading.value).toBe(false);
  });

  it('clear() cancels the fade timer so nothing happens after DISPLAY_MS', () => {
    const { message, fading, show, clear } = useToast();
    show('Hi');
    clear();
    vi.advanceTimersByTime(DISPLAY_MS + FADE_MS + 100);
    expect(message.value).toBeNull();
    expect(fading.value).toBe(false);
  });
});
