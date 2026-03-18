import { useCallback, useEffect, useRef, useState } from 'react';
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

export interface GameStartPayload {
  roomId: string;
  players: Player[];
}

export interface PlayerInputPayload {
  roomId: string;
  playerId: string;
  tiltX: number;
  tiltY: number;
  timestamp: number;
}

export interface LaunchBeyPayload {
  playerSocketId: string;
  power: number;
  timestamp: number;
}

interface SocketErrorPayload {
  code: string;
  message: string;
}

export interface GameSocketOptions {
  onLaunch?: (payload: LaunchBeyPayload) => void;
}

export const useGameSocket = (roomIdHint?: string, options?: GameSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(roomIdHint ?? null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [latestGameStart, setLatestGameStart] = useState<GameStartPayload | null>(null);
  const [latestPlayerInput, setLatestPlayerInput] = useState<PlayerInputPayload | null>(null);
  const [latestPlayerInputs, setLatestPlayerInputs] = useState<Record<string, PlayerInputPayload>>({});
  const [error, setError] = useState<SocketErrorPayload | null>(null);
  const [latestLaunchBey, setLatestLaunchBey] = useState<LaunchBeyPayload | null>(null);
  const [debugEvents, setDebugEvents] = useState<SocketDebugEvent[]>([]);
  const lastInputLogAt = useRef(0);
  const optionsRef = useRef(options);
  const roomIdRef = useRef<string | null>(roomIdHint ?? null);

  // Update options ref so effect can access current callbacks without re-subscribing to socket
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

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
      roomIdRef.current = data.roomId;
      setRoomId(data.roomId);
      setPlayers([]);
      setLatestGameStart(null);
      appendDebugEvent(ServerEvents.ROOM_CREATED, `roomId=${data.roomId}`);
    };

    const flexPlayerType = (data: PlayerListPayload) => {
      const activeRoomId = roomIdRef.current || roomIdHint || null;
      if (activeRoomId && data.roomId !== activeRoomId) {
        appendDebugEvent(ServerEvents.PLAYER_LIST, `ignored roomId=${data.roomId}`);
        return;
      }

      if (!activeRoomId) {
        roomIdRef.current = data.roomId;
        setRoomId(data.roomId);
      }

      setPlayers(data.players);
      appendDebugEvent(ServerEvents.PLAYER_LIST, `roomId=${data.roomId} count=${data.players.length}`);
    };

    const onGameStart = (payload: GameStartPayload) => {
      const nextRoomId = payload?.roomId || roomIdHint || '';
      const nextPlayers = payload?.players || [];
      roomIdRef.current = nextRoomId || null;
      setRoomId(nextRoomId ?? null);
      setPlayers(nextPlayers);
      setLatestGameStart({ roomId: nextRoomId, players: nextPlayers });
      setLatestPlayerInputs({});
      appendDebugEvent(ServerEvents.GAME_START, `roomId=${nextRoomId} players=${nextPlayers.length}`);
    };

    const onPlayerInput = (payload: PlayerInputPayload) => {
      if (!payload?.playerId) return;
      setLatestPlayerInput(payload);
      setLatestPlayerInputs((prev) => ({
        ...prev,
        [payload.playerId]: payload,
      }));

      const now = Date.now();
      if (now - lastInputLogAt.current >= 500) {
        appendDebugEvent(ServerEvents.PLAYER_INPUT, `player=${payload.playerId.slice(0, 6)} tilt=(${payload.tiltX.toFixed(2)}, ${payload.tiltY.toFixed(2)})`);
        lastInputLogAt.current = now;
      }
    };

    const onLaunchBey = (payload: LaunchBeyPayload) => {
      setLatestLaunchBey(payload);
      appendDebugEvent(ServerEvents.LAUNCH_BEY, `player=${payload.playerSocketId.slice(0, 6)} power=${payload.power.toFixed(2)}`);
      
      // Execute callback if provided
      if (optionsRef.current?.onLaunch) {
        optionsRef.current.onLaunch(payload);
      }
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
    socket.on(ServerEvents.PLAYER_INPUT, onPlayerInput);
    socket.on(ServerEvents.LAUNCH_BEY, onLaunchBey);
    socket.on(ServerEvents.ERROR, onError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off(ServerEvents.ROOM_CREATED, onRoomCreated);
      socket.off(ServerEvents.PLAYER_LIST, flexPlayerType);
      socket.off(ServerEvents.GAME_START, onGameStart);
      socket.off(ServerEvents.PLAYER_INPUT, onPlayerInput);
      socket.off(ServerEvents.LAUNCH_BEY, onLaunchBey);
      socket.off(ServerEvents.ERROR, onError);
      // We don't disconnect entirely here, since navigating between pages keeps the socket alive
    };
  }, [roomIdHint]);

  const createRoom = useCallback(() => {
    appendDebugEvent('emit:createRoom');
    gameSocket.createRoom();
  }, []);

  const startGame = useCallback(() => {
    if (roomId) {
      appendDebugEvent('emit:startGame', `roomId=${roomId}`);
      gameSocket.startGame(roomId);
    }
  }, [roomId]);

  const triggerVibrate = useCallback(() => {
    if (roomId) {
      appendDebugEvent('emit:triggerVibrate', `roomId=${roomId}`);
      gameSocket.triggerVibrate(roomId);
    }
  }, [roomId]);

  const triggerVibrateTargets = useCallback((targetSocketIds: string[], pattern: number[] = [120, 60, 120]) => {
    if (!roomId || targetSocketIds.length === 0) {
      return;
    }

    appendDebugEvent(
      'emit:triggerVibrateTargets',
      `roomId=${roomId} targets=${targetSocketIds.length}`,
    );
    gameSocket.triggerVibrate(roomId, targetSocketIds, pattern);
  }, [roomId]);

  const endRoom = useCallback(() => {
    if (!roomId) {
      return;
    }

    appendDebugEvent('emit:endRoom', `roomId=${roomId}`);
    gameSocket.endRoom(roomId);
    roomIdRef.current = null;
    setRoomId(null);
    setPlayers([]);
    setLatestGameStart(null);
    setLatestPlayerInput(null);
    setLatestPlayerInputs({});
  }, [roomId]);

  return {
    isConnected,
    roomId,
    players,
    latestGameStart,
    latestPlayerInput,
    latestPlayerInputs,
    latestLaunchBey,
    error,
    debugEvents: ENABLE_SOCKET_TIMELINE ? debugEvents : [],
    createRoom,
    startGame,
    triggerVibrate,
    triggerVibrateTargets,
    endRoom,
  };
};
