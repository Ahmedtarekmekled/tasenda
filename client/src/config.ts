// API URL from environment variable or default to localhost
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Socket URL from environment variable or default to localhost
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

// App configuration
export const APP_CONFIG = {
  appName: 'Tasenda',
  appDescription: 'A real-time multiplayer gaming platform',
  maxPlayersPerGame: 8
}; 