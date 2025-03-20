const socketIo = require('socket.io');
const { verifyToken } = require('../middleware/auth');
const User = require('../models/user.model');
const Game = require('../models/game.model');
const { initializeGameState, processGameAction } = require('../services/game.service');

// Store active game rooms and their players
const gameRooms = new Map();

const initializeSocket = (server) => {
  const io = socketIo(server, {
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
        return next(new Error('Authentication error: Token missing'));
      }
      
      const decoded = verifyToken(token);
      
      if (!decoded) {
        return next(new Error('Authentication error: Invalid token'));
      }
      
      // Find user by id
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }
      
      // Attach user to socket
      socket.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      };
      
      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.id})`);

    // Join a game room
    socket.on('join-game', async ({ gameId }) => {
      if (!gameId) return;
      
      // Join the socket room
      socket.join(gameId);
      
      // Add player to game room tracking
      if (!gameRooms.has(gameId)) {
        gameRooms.set(gameId, new Set());
      }
      
      const room = gameRooms.get(gameId);
      
      // Only emit if this is a new player in the room
      if (!room.has(socket.user.id)) {
        room.add(socket.user.id);
        
        // Notify other players that someone joined
        socket.to(gameId).emit('player-joined', {
          gameId,
          playerId: socket.user.id,
          playerName: socket.user.name
        });
        
        // Initialize game state if game is in progress
        try {
          const game = await Game.findById(gameId);
          if (game && game.status === 'in-progress') {
            // If game is already in progress, send current state to the joining player
            socket.emit('game-state-update', {
              gameId,
              gameState: game.gameState,
              currentTurn: game.currentTurn
            });
          }
        } catch (error) {
          console.error('Error fetching game state:', error);
        }
      }
      
      console.log(`${socket.user.name} joined game room: ${gameId}`);
      console.log(`Players in room ${gameId}:`, Array.from(room));
    });

    // Leave a game room
    socket.on('leave-game', ({ gameId }) => {
      if (!gameId) return;
      
      // Leave the socket room
      socket.leave(gameId);
      
      // Remove player from game room tracking
      if (gameRooms.has(gameId)) {
        const room = gameRooms.get(gameId);
        
        if (room.has(socket.user.id)) {
          room.delete(socket.user.id);
          
          // Notify other players that someone left
          socket.to(gameId).emit('player-left', {
            gameId,
            playerId: socket.user.id,
            playerName: socket.user.name
          });
          
          // Clean up empty rooms
          if (room.size === 0) {
            gameRooms.delete(gameId);
          }
        }
      }
      
      console.log(`${socket.user.name} left game room: ${gameId}`);
    });

    // Handle game actions
    socket.on('game-action', async ({ gameId, action, data }) => {
      if (!gameId || !action) return;
      
      try {
        // Get the game from database
        const game = await Game.findById(gameId);
        
        if (!game) {
          socket.emit('game-error', { message: 'Game not found' });
          return;
        }
        
        // Check if game is in progress
        if (game.status !== 'in-progress') {
          socket.emit('game-error', { message: 'Game is not in progress' });
          return;
        }
        
        // Check if it's the player's turn
        if (game.currentTurn && game.currentTurn.toString() !== socket.user.id) {
          socket.emit('game-error', { message: 'Not your turn' });
          return;
        }
        
        // Process the game action
        const result = await processGameAction(game, socket.user.id, action, data);
        
        if (result.success) {
          // Save the updated game state
          game.gameState = result.gameState;
          game.currentTurn = result.nextTurn;
          
          // Check if game is completed
          if (result.gameCompleted) {
            game.status = 'completed';
          }
          
          await game.save();
          
          // Broadcast the updated game state to all players in the room
          io.to(gameId).emit('game-state-update', {
            gameId,
            gameState: game.gameState,
            currentTurn: game.currentTurn
          });
          
          // If game is completed, broadcast game-completed event
          if (result.gameCompleted) {
            io.to(gameId).emit('game-completed', {
              gameId,
              winner: result.winner,
              gameState: game.gameState
            });
          }
        } else {
          // Send error to the player who made the action
          socket.emit('game-error', { message: result.message });
        }
      } catch (error) {
        console.error('Error processing game action:', error);
        socket.emit('game-error', { message: 'Server error processing game action' });
      }
    });

    // Handle chat messages
    socket.on('chat-message', ({ gameId, message }) => {
      if (!gameId || !message) return;
      
      const messageData = {
        id: Date.now(),
        userId: socket.user.id,
        userName: socket.user.name,
        message,
        timestamp: new Date()
      };
      
      // Broadcast message to all players in the room
      io.to(gameId).emit('chat-message', messageData);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.name} (${socket.id})`);
      
      // Remove player from all game rooms they were in
      for (const [gameId, players] of gameRooms.entries()) {
        if (players.has(socket.user.id)) {
          players.delete(socket.user.id);
          
          // Notify other players that someone left
          socket.to(gameId).emit('player-left', {
            gameId,
            playerId: socket.user.id,
            playerName: socket.user.name
          });
          
          // Clean up empty rooms
          if (players.size === 0) {
            gameRooms.delete(gameId);
          }
        }
      }
    });
  });

  return io;
};

// Function to emit game updates to all players in a game room
const emitGameUpdate = (io, gameId, game) => {
  if (io && gameId) {
    io.to(gameId).emit('game-updated', {
      gameId,
      game
    });
  }
};

// Function to initialize game state when a game starts
const initializeGame = async (io, gameId) => {
  try {
    const game = await Game.findById(gameId).populate('players.user', 'name');
    
    if (!game) {
      console.error('Game not found for initialization:', gameId);
      return;
    }
    
    // Initialize game state based on game type
    const gameState = initializeGameState(game);
    
    // Set the first player's turn
    game.currentTurn = game.players[0].user._id;
    game.gameState = gameState;
    
    await game.save();
    
    // Emit game state to all players
    io.to(gameId).emit('game-state-update', {
      gameId,
      gameState,
      currentTurn: game.currentTurn
    });
    
    // Send a system message to the chat
    io.to(gameId).emit('chat-message', {
      id: Date.now(),
      type: 'system',
      message: `Game has started! It's ${game.players[0].user.name}'s turn.`,
      timestamp: new Date()
    });
    
    console.log(`Game initialized: ${gameId}`);
  } catch (error) {
    console.error('Error initializing game:', error);
  }
};

module.exports = {
  initializeSocket,
  emitGameUpdate,
  initializeGame
}; 