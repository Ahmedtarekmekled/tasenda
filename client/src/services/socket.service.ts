import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config';

let socket: Socket | null = null;

export const initializeSocket = (token: string): Socket | null => {
  if (!token) return null;
  
  if (!socket) {
    // Remove /api from the URL if it exists
    const baseUrl = API_URL.replace('/api', '');
    
    socket = io(baseUrl, {
      auth: {
        token
      },
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
  }

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinGameRoom = (gameId: string) => {
  if (socket) {
    socket.emit('join-game', { gameId });
    console.log(`Joined game room: ${gameId}`);
  }
};

export const leaveGameRoom = (gameId: string) => {
  if (socket) {
    socket.emit('leave-game', { gameId });
    console.log(`Left game room: ${gameId}`);
  }
};

export const onPlayerJoined = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('player-joined', callback);
  }
};

export const onPlayerLeft = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('player-left', callback);
  }
};

export const onGameUpdated = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('game-updated', callback);
  }
};

export const onGameStateUpdate = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('game-state-update', callback);
  }
};

export const onGameCompleted = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('game-completed', callback);
  }
};

export const onGameError = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('game-error', callback);
  }
};

export const onChatMessage = (callback: (data: any) => void) => {
  if (socket) {
    socket.on('chat-message', callback);
  }
};

export const removeGameListeners = () => {
  if (socket) {
    socket.off('player-joined');
    socket.off('player-left');
    socket.off('game-updated');
    socket.off('game-state-update');
    socket.off('game-completed');
    socket.off('game-error');
    socket.off('chat-message');
  }
};

export const getSocket = () => socket;

export const sendGameAction = (gameId: string, action: string, data: any) => {
  if (socket) {
    socket.emit('game-action', { gameId, action, data });
    console.log(`Sent game action: ${action}`, data);
  }
};

export const sendChatMessage = (gameId: string, message: string) => {
  if (socket) {
    socket.emit('chat-message', { gameId, message });
  }
}; 