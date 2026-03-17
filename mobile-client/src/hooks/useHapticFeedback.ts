import { useCallback, useEffect } from 'react';

type FeedbackIntent = 'default' | 'light' | 'impact' | 'launch';
export type HapticMode = 'vibration-api' | 'ios-checkbox' | 'none';

// ── iOS 18+ Safari: <input type="checkbox" switch> haptic hack ──────────────
// iOS 18 でトグルスイッチの触覚フィードバックが追加され、
// .click() をスクリプトから呼ぶだけで実振動を発動できる。
//
// ⚠️ iOS制約: setTimeout 経由の .click() はユーザジェスチャー外とみなされ無効。
// 解決策: touchstart リスナー内（ジェスチャー有効コンテキスト）で pending パルスを消費する。
let hapticCheckbox: HTMLInputElement | null = null;
let hapticSwitchLabel: HTMLLabelElement | null = null;
// サーバー起因の振動要求をキューイング。次の touchstart で消費する。
let pendingHapticPulses = 0;

const getHapticCheckbox = (): HTMLInputElement | null => {
  if (typeof document === 'undefined') return null;
  if (hapticCheckbox) return hapticCheckbox;

  const label = document.createElement('label');
  label.id = 'switch';

  const el = document.createElement('input');
  el.type = 'checkbox';
  el.setAttribute('switch', '');
  el.defaultChecked = true;

  label.appendChild(el);

  const debugVisible = isIOSCheckboxHapticAvailable();
  label.style.cssText = debugVisible
    ? 'position:fixed;right:14px;bottom:14px;z-index:9999;opacity:0.95;color:#cbd5e1;font-size:11px;display:flex;align-items:center;gap:8px;'
    : 'position:fixed;opacity:0;pointer-events:none;width:0;height:0;overflow:hidden;';

  el.style.cssText = debugVisible
    ? 'width:52px;height:32px;'
    : 'width:0;height:0;';

  if (debugVisible) {
    el.title = 'iOS Haptic Switch (debug)';
    el.setAttribute('aria-label', 'iOS Haptic Switch (debug)');
    const text = document.createElement('span');
    text.textContent = 'SwitchButton';
    label.appendChild(text);
  }

  document.body.appendChild(label);
  hapticSwitchLabel = label;
  hapticCheckbox = el;

  // touchstart でペンディング中のパルスを消費する（iOS ジェスチャーコンテキスト内で実行）
  document.addEventListener('touchstart', () => {
    consumePendingHapticPulses();
  }, { passive: true });

  return el;
};

// React の onTouchStart からも呼べるよう export する
export const consumePendingHapticPulses = (): void => {
  if (pendingHapticPulses <= 0) return;
  // iOSでは非同期化するとジェスチャー文脈を失うため、1タップで1パルスだけ同期実行する。
  pendingHapticPulses -= 1;
  const t = hapticSwitchLabel ?? hapticCheckbox;
  if (!t) return;
  t.click();
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

// fromUserGesture=true のとき: ジェスチャーコンテキスト内なので直接 click() を呼ぶ
// fromUserGesture=false のとき: Socket 起因。pendingHapticPulses に積み、次のtouchstartで消費
const playCheckboxPattern = (pattern: number[], fromUserGesture: boolean) => {
  if (!isIOSCheckboxHapticAvailable()) return;
  getHapticCheckbox(); // 初回生成を保証

  // パターンから総パルス数を計算 (偶数index = 振動区間)
  let totalPulses = 0;
  for (let i = 0; i < pattern.length; i += 1) {
    if (i % 2 === 0) {
      const segMs = Math.max(0, pattern[i] || 0);
      totalPulses += Math.max(1, Math.round(segMs / 50));
    }
  }
  if (totalPulses <= 0) totalPulses = 1;

  if (fromUserGesture) {
    // ユーザジェスチャー文脈: 直接 click()
    const target = hapticSwitchLabel ?? hapticCheckbox;
    if (!target) return;
    for (let i = 0; i < totalPulses; i += 1) {
      target.click();
    }
  } else {
    // Socket 起因: pending に積み、次の touchstart で消費
    pendingHapticPulses += totalPulses;
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
  useEffect(() => {
    if (isIOSCheckboxHapticAvailable()) {
      getHapticCheckbox();
    }
  }, []);

  const triggerFeedback = useCallback((pattern: number[] = [200], intent: FeedbackIntent = 'default', fromUserGesture = false) => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    // Android/Chrome: Vibration API
    if (typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
      return;
    }

    // iOS 18+ Safari: checkbox switch haptic hack
    if (isIOSCheckboxHapticAvailable()) {
      playCheckboxPattern(getIntentPattern(intent, pattern), fromUserGesture);
    }
  }, []);

  return { triggerFeedback, isSupported: isHapticSupported(), mode: getHapticMode() };
};
