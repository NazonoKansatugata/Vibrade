import { useState, useEffect, useRef } from 'react';
import { SensorFilter } from '../sensors/sensorFilter';
import { GestureDetector, GestureState } from '../sensors/gestureDetector';

export interface SensorData {
  tiltX: number; // -1 to 1
  tiltY: number; // -1 to 1
  shakePower: number; // 0 to 1
  gestureState: GestureState;
}

export const useSensor = (): SensorData => {
  const [data, setData] = useState<SensorData>({
    tiltX: 0,
    tiltY: 0,
    shakePower: 0,
    gestureState: GestureState.IDLE,
  });

  // フィルタとジェスチャー検出器のインスタンス
  const betaFilter = useRef(new SensorFilter(0.2));
  const gammaFilter = useRef(new SensorFilter(0.2));
  const accelFilter = useRef(new SensorFilter(0.4)); // 加速度は少し反応をよくする
  const detector = useRef(new GestureDetector());

  // 最新の値を保持するRef (setStateの遅延対策)
  const latestTilt = useRef({ x: 0, y: 0 });

  useEffect(() => {
    // 1. 傾き (DeviceOrientation)
    const handleOrientation = (event: DeviceOrientationEvent) => {
      // iOS: e.beta (-180 to 180), e.gamma (-90 to 90)
      const rawBeta = event.beta || 0;
      const rawGamma = event.gamma || 0;

      // フィルタリング
      const filteredBeta = betaFilter.current.filter(rawBeta);
      const filteredGamma = gammaFilter.current.filter(rawGamma);

      // デッドゾーン適用
      const deadBeta = SensorFilter.applyDeadzone(filteredBeta, 2.0);
      const deadGamma = SensorFilter.applyDeadzone(filteredGamma, 2.0);

      // 正規化 (-1 ~ 1)
      // 横持ちや縦持ちなどゲームの持ち方次第だが、今回はスマホを水平基調で持つと仮定
      // Y方向(前後の傾き): Beta (上限45度)
      // X方向(左右の傾き): Gamma (上限45度)
      const tiltY = SensorFilter.normalize(deadBeta, 45); 
      const tiltX = SensorFilter.normalize(deadGamma, 45);

      latestTilt.current = { x: tiltX, y: tiltY };
      
      setData((prev) => ({
        ...prev,
        tiltX,
        tiltY
      }));
    };

    // 2. 加速度 (DeviceMotion)
    const handleMotion = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x === null || acc.y === null || acc.z === null) return;

      // 3軸の合成加速度
      const magnitude = Math.sqrt(acc.x * acc.x + acc.y * acc.y + acc.z * acc.z);
      
      // フィルタリング (重力加速度約9.8を除外するかはジェスチャー側の閾値次第)
      const filteredMag = accelFilter.current.filter(magnitude);

      // Z軸加速度（前後の振り）
      const accZ = acc.z;

      // ジェスチャー判定
      const gesture = detector.current.detect(filteredMag, accZ);

      // gesture.state / shakePower が古いまま残ると送信条件とUI表示がズレるため、差分がある時は同期する
      setData((prev) => {
        if (
          prev.gestureState !== gesture.state
          || prev.shakePower !== gesture.shakePower
          || gesture.isLaunching
        ) {
          return {
            ...prev,
            gestureState: gesture.state,
            shakePower: gesture.shakePower
          };
        }
        return prev;
      });
      
      // 振動フィードバック (発射成功時)
      if (gesture.isLaunching && navigator.vibrate) {
        navigator.vibrate(100);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    window.addEventListener('devicemotion', handleMotion);

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('devicemotion', handleMotion);
    };
  }, []);

  return data;
};
