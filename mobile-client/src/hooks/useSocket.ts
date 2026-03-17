import { useEffect, useRef, useState } from 'react';
import { controlSocket } from '../socket/controlSocket';
import { ServerEvents } from '../socket/events';
import { isHapticSupported, useHapticFeedback } from './useHapticFeedback';

export interface GameStateData {
  roomId: string;
  status: 'waiting' | 'armed' | 'playing' | 'ended';
  isGameActive: boolean;
  tick: number;
  winnerId?: string | null;
  beys: Record<string, {
    energy: number;
    isActive: boolean;
  }>;
}



export const useSocket = (roomId: string, playerName: string, beyType: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameStateData | null>(null);
  const wasLaunchActiveRef = useRef(false);
  const { triggerFeedback } = useHapticFeedback();

  useEffect(() => {
    // 接続と入室
    const socket = controlSocket.connect();
    controlSocket.joinRoom(roomId, playerName, beyType);

    const onConnect = () => {
      setIsConnected(true);
    };
    const onDisconnect = () => {
      setIsConnected(false);
    };
    
    // ゲーム状態の受信
    const onGameState = (state: GameStateData) => {
      setGameState(state);
    };

    // GAME_START が GAME_STATE より先に来ても開始状態にできるようにする
    const onGameStarted = () => {
      setGameState((prev) => {
        if (prev) {
          return { ...prev, status: 'playing', isGameActive: true };
        }

        return {
          roomId,
          status: 'playing',
          isGameActive: true,
          tick: 0,
          winnerId: null,
          beys: {},
        };
      });
    };

    const onCollision = () => {
      // 衝突時のフィードバック
      triggerFeedback([100, 50, 100], 'impact');
    };

    const onError = () => {
    };

    const onVibrate = (data: { pattern?: number[] }) => {
      triggerFeedback(data.pattern || [200, 100, 200], 'launch');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(ServerEvents.GAME_STATE, onGameState);
    socket.on(ServerEvents.GAME_START, onGameStarted);
    socket.on(ServerEvents.COLLISION, onCollision);
    socket.on(ServerEvents.VIBRATE, onVibrate);
    socket.on(ServerEvents.ERROR, onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(ServerEvents.GAME_STATE, onGameState);
      socket.off(ServerEvents.GAME_START, onGameStarted);
      socket.off(ServerEvents.COLLISION, onCollision);
      socket.off(ServerEvents.VIBRATE, onVibrate);
      socket.off(ServerEvents.ERROR, onError);
      controlSocket.disconnect();
    };
  }, [roomId, playerName, beyType, triggerFeedback]);

  // Socket経由で入力を送信する関数
  const sendInput = (tiltX: number, tiltY: number, shakePower: number) => {
    const isLaunchActive = shakePower > 0;
    const launchPower = isLaunchActive && !wasLaunchActiveRef.current ? shakePower : 0;

    wasLaunchActiveRef.current = isLaunchActive;

    controlSocket.sendInput(tiltX, tiltY, launchPower);
  };

  return {
    isConnected,
    gameState,
    sendInput,
    isVibrationSupported: isHapticSupported()
  };
};
