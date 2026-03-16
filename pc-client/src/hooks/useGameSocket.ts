import { useEffect, useState } from 'react';
import { gameSocket } from '../socket/gameSocket';
import { ServerEvents } from '../socket/events';
import type { Player } from '../types';

const ENABLE_SOCKET_TIMELINE = true;

export interface SocketDebugEvent {
  at: string;
  event: string;
  detail?: string;
}

interface PlayerListPayload {
  roomId: string;
  players: Player[];
}

interface SocketErrorPayload {
  code: string;
  message: string;
}

export interface GameStateData {
  roomId: string;
  isGameActive: boolean;
  tick: number;
  winnerId?: string | null;
  beys: Record<string, {
    position: { x: number, y: number };
    velocity: { x: number, y: number };
    spinPower: number;
    energy: number;
    isActive: boolean;
  }>;
}

export const useGameSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameState, setGameState] = useState<GameStateData | null>(null);
  const [error, setError] = useState<SocketErrorPayload | null>(null);
  const [debugEvents, setDebugEvents] = useState<SocketDebugEvent[]>([]);

  const appendDebugEvent = (event: string, detail?: string) => {
    if (!ENABLE_SOCKET_TIMELINE) {
      return;
    }

    const entry: SocketDebugEvent = {
      at: new Date().toLocaleTimeString('ja-JP', { hour12: false }),
      event,
      detail,
    };

    setDebugEvents((prev) => [entry, ...prev].slice(0, 40));
  };

  useEffect(() => {
    const socket = gameSocket.connect();

    const onConnect = () => {
      setIsConnected(true);
      appendDebugEvent('connect');
    };
    const onDisconnect = () => {
      setIsConnected(false);
      appendDebugEvent('disconnect');
    };
    
    const onRoomCreated = (data: { roomId: string }) => {
      setRoomId(data.roomId);
      appendDebugEvent(ServerEvents.ROOM_CREATED, `roomId=${data.roomId}`);
    };

    const flexPlayerType = (data: PlayerListPayload) => {
      setPlayers(data.players);
      appendDebugEvent(ServerEvents.PLAYER_LIST, `count=${data.players.length}`);
    };

    const onGameState = (state: GameStateData) => {
      setGameState(state);
      appendDebugEvent(
        ServerEvents.GAME_STATE,
        `tick=${state.tick} active=${state.isGameActive} beys=${Object.keys(state.beys).length}`,
      );
    };

    const onGameStart = () => {
      appendDebugEvent(ServerEvents.GAME_START);
    };

    const onError = (err: SocketErrorPayload) => {
      setError(err);
      console.error('Socket Error:', err);
      appendDebugEvent(ServerEvents.ERROR, `${err.code}: ${err.message}`);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(ServerEvents.ROOM_CREATED, onRoomCreated);
    socket.on(ServerEvents.PLAYER_LIST, flexPlayerType);
    socket.on(ServerEvents.GAME_START, onGameStart);
    socket.on(ServerEvents.GAME_STATE, onGameState);
    socket.on(ServerEvents.ERROR, onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(ServerEvents.ROOM_CREATED, onRoomCreated);
      socket.off(ServerEvents.PLAYER_LIST, flexPlayerType);
      socket.off(ServerEvents.GAME_START, onGameStart);
      socket.off(ServerEvents.GAME_STATE, onGameState);
      socket.off(ServerEvents.ERROR, onError);
      // We don't disconnect entirely here, since navigating between pages keeps the socket alive
    };
  }, []);

  const createRoom = () => {
    appendDebugEvent('emit:createRoom');
    gameSocket.createRoom();
  };

  const startGame = () => {
    if (roomId) {
      appendDebugEvent('emit:startGame', `roomId=${roomId}`);
      gameSocket.startGame(roomId);
    }
  };

  return {
    isConnected,
    roomId,
    players,
    gameState,
    error,
    debugEvents: ENABLE_SOCKET_TIMELINE ? debugEvents : [],
    createRoom,
    startGame
  };
};
