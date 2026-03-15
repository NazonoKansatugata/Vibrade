import { useEffect, useState } from 'react';
import { controlSocket } from '../socket/controlSocket';
import { ServerEvents } from '../socket/events';

export interface GameStateData {
  roomId: string;
  isGameActive: boolean;
  tick: number;
  winnerId?: string | null;
  beys: Record<string, {
    energy: number;
    isActive: boolean;
  }>;
}

export const useSocket = (roomId: string, playerName: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameStateData | null>(null);

  useEffect(() => {
    // 接続と入室
    const socket = controlSocket.connect();
    controlSocket.joinRoom(roomId, playerName);

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    
    // ゲーム状態の受信
    const onGameState = (state: GameStateData) => {
      setGameState(state);
    };

    // ゲーム開始イベント等があればここに追加
    const onGameStarted = () => {
      setGameState(prev => prev ? { ...prev, isGameActive: true } : null);
    };

    const onCollision = () => {
      // 衝突時の振動フィードバック
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]); // ブッ、ブッ
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(ServerEvents.GAME_STATE, onGameState);
    socket.on(ServerEvents.GAME_START, onGameStarted);
    socket.on(ServerEvents.COLLISION, onCollision);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(ServerEvents.GAME_STATE, onGameState);
      socket.off(ServerEvents.GAME_START, onGameStarted);
      socket.off(ServerEvents.COLLISION, onCollision);
      controlSocket.disconnect();
    };
  }, [roomId, playerName]);

  // Socket経由で入力を送信する関数
  const sendInput = (tiltX: number, tiltY: number, shakePower: number) => {
    controlSocket.sendInput(tiltX, tiltY, shakePower);
  };

  return {
    isConnected,
    gameState,
    sendInput
  };
};
