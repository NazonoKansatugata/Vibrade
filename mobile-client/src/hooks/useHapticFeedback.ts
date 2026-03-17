import { useCallback } from 'react';

export const useHapticFeedback = () => {
  const triggerFeedback = useCallback((pattern: number[] = [200]) => {
    // 1. Android/Chrome などの標準的なバイブレーションAPIを試行
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
      return;
    }

    // 2. iOS Safari などのための Web Audio API による擬似フィードバック
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      
      // iOSではユーザー操作直後でないと Suspended 状態で始まることがある
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = 'sine';
      oscillator.frequency.value = 60; // 低周波数で「ポツッ」という感触を出す

      // 音量の減衰（エンベロープ）を作ってクリック感を出す
      const now = audioContext.currentTime;
      const duration = (pattern[0] || 200) / 1000;

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration);

      oscillator.start(now);
      oscillator.stop(now + duration);

      // 短い振動パターンの場合は連動させる（簡易実装）
      if (pattern.length > 1) {
        // パターンが複数の場合は再帰的に呼び出すことも検討できるが、
        // 複雑化を避けるため単発のフィードバックを中心に設計
      }
    } catch (e) {
      console.error('Haptic feedback error:', e);
    }
  }, []);

  return { triggerFeedback };
};
