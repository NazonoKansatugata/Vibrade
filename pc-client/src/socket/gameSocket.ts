import { io, Socket } from 'socket.io-client';
import { ClientEvents } from './events';

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3000';

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

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
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
