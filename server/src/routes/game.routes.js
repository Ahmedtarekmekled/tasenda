const express = require('express');
const router = express.Router();
const gameController = require('../controllers/game.controller');
const { authenticate } = require('../middleware/auth');
const { validateGameCreation } = require('../middleware/validation.middleware');
const Game = require('../models/game.model');

// Create a new game
router.post('/', authenticate, gameController.createGame);

// Get all games for the current user
router.get('/', authenticate, gameController.getUserGames);

// Get game info by invite code (public)
router.get('/invite/:inviteCode', gameController.getGameByInviteCode);

// Join a game by invite code
router.post('/join/:inviteCode', authenticate, gameController.joinGameByInviteCode);

// Get a game by ID
router.get('/:id', authenticate, gameController.getGameById);

// Update game status
router.patch('/:id/status', authenticate, gameController.updateGameStatus);

// Leave a game
router.post('/:id/leave', authenticate, gameController.leaveGame);

// Add a debug endpoint to check game state
router.get('/:id/debug', authenticate, async (req, res) => {
  try {
    const gameId = req.params.id;
    const game = await Game.findById(gameId)
      .populate('players.user', 'name email')
      .populate('creator', 'name email');
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Return detailed game state for debugging
    res.json({
      success: true,
      game: {
        id: game._id,
        title: game.title,
        status: game.status,
        gameType: game.gameType,
        creator: game.creator,
        players: game.players,
        gameState: game.gameState,
        createdAt: game.createdAt,
        updatedAt: game.updatedAt
      }
    });
  } catch (error) {
    console.error('Error getting game debug info:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add a test endpoint to your game routes
router.get('/test', (req, res) => {
  res.json({ message: 'Game routes test endpoint is working' });
});

// Add a direct fix endpoint for stuck games
router.post('/:id/fix', authenticate, async (req, res) => {
  try {
    const gameId = req.params.id;
    const userId = req.user.id;
    
    console.log(`[API] User ${userId} attempting to fix game: ${gameId}`);
    
    // Find the game with full population
    const game = await Game.findById(gameId)
      .populate('players.user', 'name email')
      .populate('creator', 'name email');
    
    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }
    
    // Check if user is the host
    if (game.creator._id.toString() !== userId) {
      return res.status(403).json({ message: 'Only the host can fix the game' });
    }
    
    // Make the creator the first word selector
    const creatorId = game.creator._id.toString();
    
    // Find a player who is not the creator to be the guesser
    const otherPlayers = game.players
      .filter(p => p.user._id.toString() !== creatorId)
      .map(p => p.user._id.toString());
    
    // If no other players, use the first player in the list
    const guesser = otherPlayers.length > 0 
      ? otherPlayers[0] 
      : game.players[0].user._id.toString();
    
    console.log(`[API] Fixing game ${gameId} - Creator: ${creatorId}, Guesser: ${guesser}`);
    
    // Force update game status and state
    game.status = 'in-progress';
    game.gameState = {
      round: 1,
      totalRounds: game.settings?.rounds || 5,
      phase: 'word-selection',
      secretWord: '',
      hints: [],
      questions: [],
      guesses: [],
      scores: {},
      wordSelector: creatorId,
      guesser: guesser,
      currentTurn: creatorId
    };
    
    // Save the updated game
    await game.save();
    console.log(`[API] Game fixed successfully: ${gameId}`);
    
    // Return the updated game
    res.json({
      success: true,
      message: 'Game fixed successfully',
      game: {
        ...game.toObject(),
        players: game.players.map(p => ({
          ...p.toObject(),
          user: {
            _id: p.user._id,
            name: p.user.name,
            email: p.user.email
          }
        }))
      }
    });
  } catch (error) {
    console.error('Error fixing game:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 