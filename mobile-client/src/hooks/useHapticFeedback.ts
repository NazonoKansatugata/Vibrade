import { useCallback } from 'react';

type FeedbackIntent = 'default' | 'light' | 'impact' | 'launch';
export type HapticMode = 'vibration-api' | 'ios-checkbox' | 'none';

// ── iOS 18+ Safari: <input type="checkbox" switch> haptic hack ──────────────
// iOS 18 でトグルスイッチの触覚フィードバックが追加され、
// .click() をスクリプトから呼ぶだけで実振動を発動できる。
let hapticCheckbox: HTMLInputElement | null = null;

const getHapticCheckbox = (): HTMLInputElement | null => {
  if (typeof document === 'undefined') return null;
  if (hapticCheckbox) return hapticCheckbox;
  const el = document.createElement('input');
  el.type = 'checkbox';
  el.setAttribute('switch', '');
  el.style.cssText = 'position:fixed;opacity:0;pointer-events:none;width:0;height:0;';
  document.body.appendChild(el);
  hapticCheckbox = el;
  return el;
};

const isIOSCheckboxHapticAvailable = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  // Chrome/Firefox on iOS はこの機能を持たないため除外
  const isSafariLike = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS/.test(ua);
  const match = ua.match(/OS (\d+)[._]/);
  const ver = match ? parseInt(match[1], 10) : 0;
  return isSafariLike && ver >= 18;
};

const playCheckboxPattern = (pattern: number[]) => {
  const el = getHapticCheckbox();
  if (!el) return;
  // 偶数indexが振動区間。50ms ≒ 1パルスとして分割して連打する
  let cursorMs = 0;
  for (let i = 0; i < pattern.length; i += 1) {
    const segMs = Math.max(0, pattern[i] || 0);
    if (i % 2 === 0 && segMs > 0) {
      const pulseCount = Math.max(1, Math.round(segMs / 50));
      for (let p = 0; p < pulseCount; p += 1) {
        setTimeout(() => el.click(), cursorMs + p * 50);
      }
    }
    cursorMs += segMs;
  }
};

// ── Intent → pattern helper ──────────────────────────────────────────────────
const getIntentPattern = (intent: FeedbackIntent, fallback: number[]): number[] => {
  if (intent === 'light') return [40];
  if (intent === 'impact') return [45, 30, 55];
  if (intent === 'launch') return [60, 40, 100];
  return fallback.length > 0 ? fallback : [120];
};

// ── Public API ───────────────────────────────────────────────────────────────
export const getHapticMode = (): HapticMode => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'none';
  if (typeof navigator.vibrate === 'function') return 'vibration-api';
  if (isIOSCheckboxHapticAvailable()) return 'ios-checkbox';
  return 'none';
};

export const isHapticSupported = (): boolean => getHapticMode() !== 'none';

export const useHapticFeedback = () => {
  const triggerFeedback = useCallback((pattern: number[] = [200], intent: FeedbackIntent = 'default') => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    // Android/Chrome: Vibration API
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
      return;
    }

    // iOS 18+ Safari: checkbox switch haptic hack
    if (isIOSCheckboxHapticAvailable()) {
      playCheckboxPattern(getIntentPattern(intent, pattern));
    }
  }, []);

  return { triggerFeedback, isSupported: isHapticSupported(), mode: getHapticMode() };
};
