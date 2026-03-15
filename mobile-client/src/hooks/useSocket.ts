import { useEffect, useState } from 'react';
import { controlSocket } from '../socket/controlSocket';

export interface GameStateData {
  // Define necessary properties passed from server
  state: 'waiting' | 'playing' | 'ended';
  hp?: number;
  playersCount?: number;
  message?: string;
  // etc
}

export const useSocket = (roomId: string, playerName: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameStateData>({ state: 'waiting' });

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
      setGameState(prev => ({ ...prev, state: 'playing' }));
    };

    const onCollision = () => {
      // 衝突時の振動フィードバック
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]); // ブッ、ブッ
      }
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('gameState', onGameState);
    socket.on('gameStarted', onGameStarted);
    socket.on('collision', onCollision);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('gameState', onGameState);
      socket.off('gameStarted', onGameStarted);
      socket.off('collision', onCollision);
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
