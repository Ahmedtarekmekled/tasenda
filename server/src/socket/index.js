const socketIO = require('socket.io');
const { verifyToken } = require('../utils/auth');

const socketSetup = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error: Token required'));
      }

      const decoded = verifyToken(token);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection event
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id}`);

    // Join a game room
    socket.on('join-game', (gameId) => {
      socket.join(`game:${gameId}`);
      console.log(`User ${socket.user.id} joined game ${gameId}`);
      
      // Notify others in the room
      socket.to(`game:${gameId}`).emit('user-joined', {
        userId: socket.user.id,
        username: socket.user.username
      });
    });

    // Leave a game room
    socket.on('leave-game', (gameId) => {
      socket.leave(`game:${gameId}`);
      console.log(`User ${socket.user.id} left game ${gameId}`);
      
      // Notify others in the room
      socket.to(`game:${gameId}`).emit('user-left', {
        userId: socket.user.id,
        username: socket.user.username
      });
    });

    // Game action
    socket.on('game-action', ({ gameId, action, data }) => {
      // Broadcast to everyone in the room except sender
      socket.to(`game:${gameId}`).emit('game-update', {
        userId: socket.user.id,
        username: socket.user.username,
        action,
        data
      });
    });

    // Disconnect event
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });

  return io;
};

module.exports = socketSetup; 