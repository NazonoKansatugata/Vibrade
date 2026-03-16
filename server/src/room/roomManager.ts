import { generateRoomId } from './roomId.js';
import { v4 as uuidv4 } from 'uuid';

export interface Player {
  id: string;
  socketId: string;
  name: string;
  ready: boolean;
  // beyId: string;
}

export interface Room {
  roomId: string;
  hostSocketId: string;
  players: Player[];
  createdAt: number;
}

class RoomManager {
  private rooms: Record<string, Room> = {};

  getPlayerContextBySocketId(socketId: string): { roomId: string; room: Room; player: Player } | null {
    for (const roomId in this.rooms) {
      const room = this.rooms[roomId];
      if (!room) continue;

      const player = room.players.find((p) => p.socketId === socketId);
      if (player) {
        return { roomId, room, player };
      }
    }

    return null;
  }

  createRoom(hostSocketId: string): Room {
    let roomId = generateRoomId();
    while (this.rooms[roomId]) {
      roomId = generateRoomId(); // Retry if conflict
    }

    const room: Room = {
      roomId,
      hostSocketId,
      players: [],
      createdAt: Date.now()
    };
    
    this.rooms[roomId] = room;
    return room;
  }

  getRoom(roomId: string): Room | undefined {
    return this.rooms[roomId];
  }

  addPlayer(roomId: string, socketId: string, playerName: string): { room: Room, player: Player } | null {
    const room = this.rooms[roomId];
    if (!room) return null;
    
    // MAX 8 players
    if (room.players.length >= 8) return null;

    const player: Player = {
      id: uuidv4(),
      socketId,
      name: playerName || 'Guest',
      ready: false
    };

    room.players.push(player);
    return { room, player };
  }

  removePlayer(socketId: string): { roomId: string, room: Room } | null {
    for (const roomId in this.rooms) {
      const room = this.rooms[roomId];
      if (!room) continue;
      
      const index = room.players.findIndex(p => p.socketId === socketId);
      
      if (index !== -1) {
        room.players.splice(index, 1);
        return { roomId, room };
      }
    }
    return null;
  }

  removeRoom(roomId: string) {
    delete this.rooms[roomId];
  }

  removeRoomByHostId(hostSocketId: string): string | null {
    for (const roomId in this.rooms) {
      const room = this.rooms[roomId];
      if (room && room.hostSocketId === hostSocketId) {
        delete this.rooms[roomId];
        return roomId;
      }
    }
    return null;
  }

  getAllActiveRoomIds(): string[] {
    return Object.keys(this.rooms);
  }
}

export const roomManager = new RoomManager();
