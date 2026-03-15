import { useEffect, useState } from 'react';
import { gameSocket } from '../socket/gameSocket';
import { ServerEvents } from '../socket/events';
import type { Player } from '../types';

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

  useEffect(() => {
    const socket = gameSocket.connect();

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    
    const onRoomCreated = (data: { roomId: string }) => {
      setRoomId(data.roomId);
    };

    const flexPlayerType = (data: PlayerListPayload) => {
      setPlayers(data.players);
    };

    const onGameState = (state: GameStateData) => {
      setGameState(state);
    };

    const onError = (err: SocketErrorPayload) => {
      setError(err);
      console.error('Socket Error:', err);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on(ServerEvents.ROOM_CREATED, onRoomCreated);
    socket.on(ServerEvents.PLAYER_LIST, flexPlayerType);
    socket.on(ServerEvents.GAME_STATE, onGameState);
    socket.on(ServerEvents.ERROR, onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(ServerEvents.ROOM_CREATED, onRoomCreated);
      socket.off(ServerEvents.PLAYER_LIST, flexPlayerType);
      socket.off(ServerEvents.GAME_STATE, onGameState);
      socket.off(ServerEvents.ERROR, onError);
      // We don't disconnect entirely here, since navigating between pages keeps the socket alive
    };
  }, []);

  const createRoom = () => {
    gameSocket.createRoom();
  };

  const startGame = () => {
    if (roomId) {
      gameSocket.startGame(roomId);
    }
  };

  return {
    isConnected,
    roomId,
    players,
    gameState,
    error,
    createRoom,
    startGame
  };
};
