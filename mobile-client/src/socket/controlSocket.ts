import { io, Socket } from 'socket.io-client';
import { ClientEvents } from './events';

const SERVER_PROD_URL = 'https://vibrade-server.onrender.com';
// Default to production server, and allow env override for local development.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || SERVER_PROD_URL;

class ControlSocket {
  private socket: Socket | null = null;
  private currentRoomId: string | null = null;

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        console.log('Connected to server:', this.socket?.id);
        // Automatically rejoin room if reconnected
        if (this.currentRoomId) {
          // You'd need player name here as well if the server demands it on rejoin. 
          // Handled at the hook level usually.
        }
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from server');
      });
    }
    return this.socket;
  }

  joinRoom(roomId: string, playerName: string, beyType: string, playerId: string) {
    if (!this.socket) this.connect();
    this.currentRoomId = roomId;
    this.socket?.emit(ClientEvents.JOIN_ROOM, { roomId, playerName, beyType, playerId });
  }

  sendInput(tiltX: number, tiltY: number, shakePower: number) {
    if (!this.socket || !this.socket.connected || !this.currentRoomId) return;
    
    // In our new architecture, tilt and launch are separate events.
    // Send continuous tilt
    this.socket.emit(ClientEvents.CONTROL_INPUT, { 
      roomId: this.currentRoomId,
      tiltX, 
      tiltY, 
      timestamp: Date.now() 
    });

    // Send launch explicitly if shakePower > 0
    if (shakePower > 0) {
      this.socket.emit(ClientEvents.LAUNCH_BEY, {
        roomId: this.currentRoomId,
        power: shakePower,
        timestamp: Date.now()
      });
    }
  }

  on(event: string, callback: (...args: unknown[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: unknown[]) => void) {
    this.socket?.off(event, callback);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.currentRoomId = null;
    }
  }
}

// Singleton instance
export const controlSocket = new ControlSocket();
