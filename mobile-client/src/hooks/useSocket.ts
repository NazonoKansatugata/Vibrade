import { useEffect, useRef, useState } from 'react';
import { controlSocket } from '../socket/controlSocket';
import { ServerEvents } from '../socket/events';

const ENABLE_SOCKET_TIMELINE = true;

export interface SocketDebugEvent {
  at: string;
  event: string;
  detail?: string;
}

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

interface SocketErrorPayload {
  code: string;
  message: string;
}

export const useSocket = (roomId: string, playerName: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [gameState, setGameState] = useState<GameStateData | null>(null);
  const [debugEvents, setDebugEvents] = useState<SocketDebugEvent[]>([]);
  const lastInputLogAt = useRef(0);
  const lastLaunchLogAt = useRef(0);

  const appendDebugEvent = (event: string, detail?: string) => {
    if (!ENABLE_SOCKET_TIMELINE) {
      return;
    }

    const entry: SocketDebugEvent = {
      at: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
      event,
      detail,
    };
    setDebugEvents((prev) => [entry, ...prev].slice(0, 50));
  };

  useEffect(() => {
    // 接続と入室
    const socket = controlSocket.connect();
    controlSocket.joinRoom(roomId, playerName);
    const joinLogTimer = window.setTimeout(() => {
      appendDebugEvent('emit:joinRoom', `roomId=${roomId} player=${playerName}`);
    }, 0);

    const onConnect = () => {
      setIsConnected(true);
      appendDebugEvent('connect');
    };
    const onDisconnect = () => {
      setIsConnected(false);
      appendDebugEvent('disconnect');
    };
    
    // ゲーム状態の受信
    const onGameState = (state: GameStateData) => {
      setGameState(state);
      appendDebugEvent(ServerEvents.GAME_STATE, `tick=${state.tick} status=${state.status} active=${state.isGameActive}`);
    };

    // GAME_START が GAME_STATE より先に来ても発射待機状態にできるようにする
    const onGameStarted = () => {
      appendDebugEvent(ServerEvents.GAME_START);
      setGameState((prev) => {
        if (prev) {
          return { ...prev, status: 'armed', isGameActive: false };
        }

        return {
          roomId,
          status: 'armed',
          isGameActive: false,
          tick: 0,
          winnerId: null,
          beys: {},
        };
      });
    };

    const onCollision = () => {
      appendDebugEvent(ServerEvents.COLLISION);
      // 衝突時の振動フィードバック
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]); // ブッ、ブッ
      }
    };

    const onError = (err: SocketErrorPayload) => {
      appendDebugEvent(ServerEvents.ERROR, `${err.code}: ${err.message}`);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(ServerEvents.GAME_STATE, onGameState);
    socket.on(ServerEvents.GAME_START, onGameStarted);
    socket.on(ServerEvents.COLLISION, onCollision);
    socket.on(ServerEvents.ERROR, onError);

    return () => {
      window.clearTimeout(joinLogTimer);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(ServerEvents.GAME_STATE, onGameState);
      socket.off(ServerEvents.GAME_START, onGameStarted);
      socket.off(ServerEvents.COLLISION, onCollision);
      socket.off(ServerEvents.ERROR, onError);
      controlSocket.disconnect();
    };
  }, [roomId, playerName]);

  // Socket経由で入力を送信する関数
  const sendInput = (tiltX: number, tiltY: number, shakePower: number) => {
    const now = Date.now();
    if (now - lastInputLogAt.current >= 500) {
      appendDebugEvent('emit:controlInput', `tilt=(${tiltX.toFixed(2)}, ${tiltY.toFixed(2)})`);
      lastInputLogAt.current = now;
    }

    if (shakePower > 0 && now - lastLaunchLogAt.current >= 250) {
      appendDebugEvent('emit:launchBey', `power=${shakePower.toFixed(2)}`);
      lastLaunchLogAt.current = now;
    }

    controlSocket.sendInput(tiltX, tiltY, shakePower);
  };

  return {
    isConnected,
    gameState,
    debugEvents: ENABLE_SOCKET_TIMELINE ? debugEvents : [],
    sendInput
  };
};
