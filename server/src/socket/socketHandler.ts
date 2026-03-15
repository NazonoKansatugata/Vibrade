import { Server, Socket } from 'socket.io';
import { ClientEvents, ServerEvents } from './events.js';
import { roomManager } from '../room/roomManager.js';
import { inputHandler } from '../input/inputHandler.js';
import { gestureDetector } from '../input/gestureDetector.js';
import { gameManager } from '../game/gameState.js';

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log(`[Socket Connected] ID: ${socket.id}`);

    // --- PC Client Events ---
    socket.on(ClientEvents.CREATE_ROOM, () => {
      // 1. Host creates a new room
      const room = roomManager.createRoom(socket.id);
      socket.join(room.roomId);
      
      // Initialize Game State for this room
      gameManager.createGame(room.roomId);

      console.log(`[Room Created] Room ID: ${room.roomId} by Host: ${socket.id}`);
      
      // Notify host of the new room ID
      socket.emit(ServerEvents.ROOM_CREATED, { roomId: room.roomId });
    });

    socket.on(ClientEvents.START_GAME, ({ roomId }: { roomId: string }) => {
      // Host requests game start
      const room = roomManager.getRoom(roomId);
      const game = gameManager.getGame(roomId);
      
      if (room && room.hostSocketId === socket.id && game) {
        
        // Spawn all current players in the room
        room.players.forEach(p => {
          // Initialize their beyblade with 0 power until they launch
          gameManager.spawnBey(roomId, p.socketId, 0); 
        });

        // Start the game logic flags
        gameManager.markGameStarted(roomId);

        // Notify everyone in the room (including mobile clients)
        io.to(roomId).emit(ServerEvents.GAME_START);
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

    socket.on(ClientEvents.CONTROL_INPUT, (data: { tiltX: number, tiltY: number, timestamp: number }) => {
      inputHandler.updateInput(socket.id, data.tiltX, data.tiltY, data.timestamp);
    });

    socket.on(ClientEvents.LAUNCH_BEY, (data: { roomId: string, power: number, timestamp: number }) => {
      // Validate launch constraints (cooldowns, normalization)
      const { valid, power } = gestureDetector.validateLaunch(socket.id, data.power, data.timestamp);
      
      if (valid) {
        // Apply launch power to the Beyblade in the physics engine
        const game = gameManager.getGame(data.roomId);
        const bey = game?.beys[socket.id];
        if (bey) {
           bey.spinPower += (power * 100);
           console.log(`[Launch Validated] Player ${socket.id} launched with power ${power}. Spin: ${bey.spinPower}`);
        }
      }
    });

    // --- Disconnect Handling ---
    socket.on(ClientEvents.DISCONNECT, () => {
      inputHandler.removePlayer(socket.id);
      gestureDetector.removePlayer(socket.id);
      // Case 1: Was it a Host? If host disconnects, destroy room
      const destroyedRoomId = roomManager.removeRoomByHostId(socket.id);
      if (destroyedRoomId) {
        gameManager.removeGame(destroyedRoomId); // cleanup game memory
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
