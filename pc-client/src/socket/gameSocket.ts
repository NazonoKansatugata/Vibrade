import { io, Socket } from 'socket.io-client';
import { ClientEvents } from './events';

const SERVER_PROD_URL = 'https://vibrade-server.onrender.com';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? SERVER_PROD_URL;

class GameSocket {
  private socket: Socket | null = null;

  connect() {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        console.log('成功', 'PC Host Connected:', this.socket?.id);
      });

      this.socket.on('disconnect', () => {
        console.log('PC Host Disconnected');
      });
    }
    return this.socket;
  }

  createRoom() {
    if (!this.socket) this.connect();
    this.socket?.emit(ClientEvents.CREATE_ROOM);
  }

  startGame(roomId: string) {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit(ClientEvents.START_GAME, { roomId });
  }

  triggerVibrate(roomId: string, targetSocketIds?: string[], pattern?: number[]) {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit(ClientEvents.TRIGGER_VIBRATE, { roomId, targetSocketIds, pattern });
  }

  endRoom(roomId: string) {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit(ClientEvents.END_ROOM, { roomId });
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
    }
  }
}

export const gameSocket = new GameSocket();
