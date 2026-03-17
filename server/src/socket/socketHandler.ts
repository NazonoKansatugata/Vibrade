import { Server, Socket } from 'socket.io';
import { ClientEvents, ServerEvents } from './events.js';
import { roomManager } from '../room/roomManager.js';

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket Connected] ID: ${socket.id}`);

    // --- PC Client Events ---
    socket.on(ClientEvents.CREATE_ROOM, () => {
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
    socket.on(ClientEvents.JOIN_ROOM, ({ roomId, playerName }: { roomId: string, playerName: string }) => {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        socket.emit(ServerEvents.ERROR, { code: 'NOT_FOUND', message: 'Room not found' });
        return;
      }

      // Add player to room state
      const result = roomManager.addPlayer(roomId, socket.id, playerName);
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

    socket.on(ClientEvents.TRIGGER_VIBRATE, (data: { roomId: string }) => {
      console.log(`[Vibrate Triggered] Room: ${data.roomId} by: ${socket.id}`);
      // Broadcast to all clients in the room (including mobiles)
      io.to(data.roomId).emit(ServerEvents.VIBRATE, {
        pattern: [200, 100, 200], // Default bread-pulse
        timestamp: Date.now()
      });
    });

    // --- Disconnect Handling ---
    socket.on(ClientEvents.DISCONNECT, () => {
      // Case 1: Was it a Host? If host disconnects, destroy room
      const destroyedRoomId = roomManager.removeRoomByHostId(socket.id);
      if (destroyedRoomId) {
        console.log(`[Room Destroyed] Host disconnected. Room ID: ${destroyedRoomId}`);
        io.to(destroyedRoomId).emit(ServerEvents.ERROR, { code: 'HOST_DISCONNECTED', message: 'The host has left the game.' });
        io.socketsLeave(destroyedRoomId); // force everyone out of the socket.io room
        return;
      }

      // Case 2: Was it a Player?
      const removeResult = roomManager.removePlayer(socket.id);
      if (removeResult) {
        console.log(`[Player Left] ID: ${socket.id} left Room: ${removeResult.roomId}`);
        // Notify remaining players and host
        io.to(removeResult.roomId).emit(ServerEvents.PLAYER_LIST, {
          roomId: removeResult.roomId,
          players: removeResult.room.players
        });
        
        // Auto-cleanup if room is empty (excluding host, handled by separate logic or timeout)
        // Kept simple for now. 
      }
      
      console.log(`[Socket Disconnected] ID: ${socket.id}`);
    });
  });
}
