const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../utils/auth');
const Game = require('../models/game.model');
const { handleGameAction } = require('./gameHandlers');

const setupSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = verifyToken(token);
      socket.user = { id: decoded.id, name: decoded.name };
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  // Handle connections
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.id}`);

    // Join a game room
    socket.on('join-game', async (data) => {
      const { gameId } = data;
      
      try {
        // Join the socket room for this game
        socket.join(`game:${gameId}`);
        console.log(`User ${socket.user.id} joined game room: ${gameId}`);
        
        // Notify other players
        socket.to(`game:${gameId}`).emit('player-joined', {
          id: socket.user.id,
          name: socket.user.name
        });
      } catch (err) {
        console.error('Error joining game room:', err);
        socket.emit('error', { message: 'Failed to join game room' });
      }
    });

    // Leave a game room
    socket.on('leave-game', (data) => {
      const { gameId } = data;
      
      socket.leave(`game:${gameId}`);
      console.log(`User ${socket.user.id} left game room: ${gameId}`);
      
      // Notify other players
      socket.to(`game:${gameId}`).emit('player-left', {
        id: socket.user.id,
        name: socket.user.name
      });
    });

    // Handle game actions
    socket.on('game-action', (data) => {
      handleGameAction(io, socket, data);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });

  return io;
};

module.exports = setupSocket; 