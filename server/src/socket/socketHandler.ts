import { Server, Socket } from 'socket.io';
import { ClientEvents, ServerEvents } from './events.js';
import { roomManager } from '../room/roomManager.js';

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket Connected] ID: ${socket.id}`);

    // --- PC Client Events ---
    socket.on(ClientEvents.CREATE_ROOM, () => {
      const staleRoomIds = roomManager.removeRoomsByHostId(socket.id);
      staleRoomIds.forEach((staleRoomId) => {
        io.to(staleRoomId).emit(ServerEvents.ERROR, {
          code: 'ROOM_REPLACED',
          message: 'The host created a new room. This room has been closed.'
        });
        io.socketsLeave(staleRoomId);
      });

      // 1. Host creates a new room
      const room = roomManager.createRoom(socket.id);
      socket.join(room.roomId);

      console.log(`[Room Created] Room ID: ${room.roomId} by Host: ${socket.id}`);

      // Notify host of the new room ID
      socket.emit(ServerEvents.ROOM_CREATED, { roomId: room.roomId });
    });

    socket.on(ClientEvents.START_GAME, ({ roomId }: { roomId: string }) => {
      // Host requests game start
      const room = roomManager.getRoom(roomId);

      if (room && room.hostSocketId === socket.id) {
        // PC-side authoritative physics: server only coordinates room lifecycle and input relay.
        io.to(roomId).emit(ServerEvents.GAME_START, {
          roomId,
          players: room.players
        });
        console.log(`[Game Started] Room ID: ${roomId}`);
      }
    });

    // --- Mobile Client Events ---
    socket.on(ClientEvents.JOIN_ROOM, ({ roomId, playerName, beyType, playerId }: { roomId: string, playerName: string, beyType: string, playerId?: string }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        socket.emit(ServerEvents.ERROR, { code: 'NOT_FOUND', message: 'Room not found' });
        return;
      }

      // Add player to room state
      const result = roomManager.addPlayer(roomId, socket.id, playerName, beyType, playerId);
      if (!result) {
        socket.emit(ServerEvents.ERROR, { code: 'FULL', message: 'Room is full or unavailable' });
        return;
      }

      // Join the actual Socket.io room channel
      socket.join(roomId);
      console.log(`[Player Joined] ${playerName} (ID: ${socket.id}) joined Room: ${roomId}`);

      // Broadcast updated player list to the entire room
      io.to(roomId).emit(ServerEvents.PLAYER_LIST, { 
        roomId, 
        players: result.room.players 
      });
    });

    socket.on(ClientEvents.CONTROL_INPUT, (data: { roomId?: string, tiltX: number, tiltY: number, timestamp: number }) => {
      const context = roomManager.getPlayerContextBySocketId(socket.id);
      const roomId = data.roomId || context?.roomId;
      const playerId = context?.player.id;

      if (!roomId || !playerId) {
        return;
      }

      io.to(roomId).emit(ServerEvents.PLAYER_INPUT, {
        roomId,
        playerId,
        tiltX: data.tiltX,
        tiltY: data.tiltY,
        timestamp: data.timestamp || Date.now()
      });
    });

    socket.on(ClientEvents.LAUNCH_BEY, (data: { roomId: string, power: number, timestamp: number }) => {
      // Launch is handled in PC physics for now. Keep relay for future use/debug visibility.
      console.log(`[Launch Bey] Player: ${socket.id} Power: ${data.power} Room: ${data.roomId}`);
      io.to(data.roomId).emit(ServerEvents.LAUNCH_BEY, {
        playerSocketId: socket.id,
        power: data.power,
        timestamp: data.timestamp || Date.now()
      });
    });

    socket.on(ClientEvents.TRIGGER_VIBRATE, (data: { roomId: string; targetSocketIds?: string[]; pattern?: number[] }) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) {
        socket.emit(ServerEvents.ERROR, { code: 'NOT_FOUND', message: 'Room not found' });
        return;
      }

      // Host-authoritative operation to prevent arbitrary clients from vibrating others.
      if (room.hostSocketId !== socket.id) {
        socket.emit(ServerEvents.ERROR, { code: 'UNAUTHORIZED', message: 'Only host can trigger vibration' });
        return;
      }

      const pattern = data.pattern && data.pattern.length > 0
        ? data.pattern
        : [200, 100, 200];

      const requestedTargets = Array.isArray(data.targetSocketIds) ? data.targetSocketIds : [];
      const allowedTargets = new Set(room.players.map((player) => player.socketId));
      const targetSocketIds = Array.from(new Set(requestedTargets.filter((targetId) => allowedTargets.has(targetId))));

      if (requestedTargets.length > 0) {
        if (targetSocketIds.length === 0) {
          socket.emit(ServerEvents.ERROR, { code: 'INVALID_TARGETS', message: 'No valid target sockets in room' });
          return;
        }

        console.log(`[Vibrate Targeted] Room: ${data.roomId} targets: ${targetSocketIds.length} by: ${socket.id}`);
        targetSocketIds.forEach((targetId) => {
          io.to(targetId).emit(ServerEvents.VIBRATE, {
            pattern,
            timestamp: Date.now()
          });
        });
        return;
      }

      console.log(`[Vibrate Broadcast] Room: ${data.roomId} by: ${socket.id}`);
      io.to(data.roomId).emit(ServerEvents.VIBRATE, {
        pattern,
        timestamp: Date.now()
      });
    });

    socket.on(ClientEvents.END_ROOM, ({ roomId }: { roomId: string }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        return;
      }

      if (room.hostSocketId !== socket.id) {
        socket.emit(ServerEvents.ERROR, { code: 'UNAUTHORIZED', message: 'Only host can end room.' });
        return;
      }

      roomManager.removeRoom(roomId);
      io.to(roomId).emit(ServerEvents.ERROR, {
        code: 'ROOM_ENDED',
        message: 'The host ended the room.'
      });
      io.socketsLeave(roomId);
      console.log(`[Room Ended] Room ID: ${roomId} by Host: ${socket.id}`);
    });

    // --- Disconnect Handling ---
    socket.on(ClientEvents.DISCONNECT, () => {
      // Case 1: Was it a Host? If host disconnects, destroy all host-owned rooms
      const destroyedRoomIds = roomManager.removeRoomsByHostId(socket.id);
      if (destroyedRoomIds.length > 0) {
        destroyedRoomIds.forEach((destroyedRoomId) => {
          console.log(`[Room Destroyed] Host disconnected. Room ID: ${destroyedRoomId}`);
          io.to(destroyedRoomId).emit(ServerEvents.ERROR, {
            code: 'HOST_DISCONNECTED',
            message: 'The host has left the game.'
          });
          io.socketsLeave(destroyedRoomId); // force everyone out of the socket.io room
        });
        return;
      }

      // Case 2: Was it a Player?
      roomManager.handleDisconnect(socket.id, (roomId, remainingPlayers) => {
        console.log(`[Player Timeout] ID: ${socket.id} cleanup from Room: ${roomId}`);
        io.to(roomId).emit(ServerEvents.PLAYER_LIST, {
          roomId: roomId,
          players: remainingPlayers
        });
      });

      const context = roomManager.getPlayerContextBySocketId(socket.id);
      if (context) {
        // Even if we don't remove them yet, we broadcast updated list to show "offline" status if needed
        // Or at least log it.
        console.log(`[Player Disconnected] ID: ${socket.id} (Offline) in Room: ${context.roomId}`);
        io.to(context.roomId).emit(ServerEvents.PLAYER_LIST, {
          roomId: context.roomId,
          players: context.room.players
        });
      }

      console.log(`[Socket Disconnected] ID: ${socket.id}`);
    });
  });
}
