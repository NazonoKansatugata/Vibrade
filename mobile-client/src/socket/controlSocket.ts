import { io, Socket } from 'socket.io-client';

// Note: In a real environment, the URL might come from env vars.
// During local dev across devices, you might need to connect to the explicit PC IP address.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

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

  joinRoom(roomId: string, playerName: string) {
    if (!this.socket) this.connect();
    this.currentRoomId = roomId;
    this.socket?.emit('joinRoom', { roomId, playerName });
  }

  sendInput(tiltX: number, tiltY: number, shakePower: number) {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('playerInput', { tiltX, tiltY, shakePower });
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
