import { useCallback } from 'react';

type FeedbackIntent = 'default' | 'light' | 'impact' | 'launch' | 'special';
export type HapticMode = 'vibration-api' | 'none';

// ── Intent → pattern helper ──────────────────────────────────────────────────
const getIntentPattern = (intent: FeedbackIntent, fallback: number[]): number[] => {
  if (intent === 'light') return [40];
  if (intent === 'impact') return [45, 30, 55];
  if (intent === 'launch') return [60, 40, 100];
  if (intent === 'special') return fallback.length > 0 ? fallback : [280, 120, 260, 120, 260, 120, 260];
  return fallback.length > 0 ? fallback : [120];
};

// ── Public API ───────────────────────────────────────────────────────────────
export const getHapticMode = (): HapticMode => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'none';
  if (typeof navigator.vibrate === 'function') return 'vibration-api';
  return 'none';
};

export const isHapticSupported = (): boolean => getHapticMode() !== 'none';

export const useHapticFeedback = () => {
  const triggerFeedback = useCallback((pattern: number[] = [200], intent: FeedbackIntent = 'default') => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    // Android/Chrome: Vibration API
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(getIntentPattern(intent, pattern));
    }
  }, []);

  return { triggerFeedback, isSupported: isHapticSupported(), mode: getHapticMode() };
};
