const express = require('express');
const router = express.Router();
const gameController = require('../controllers/game.controller');
const { authenticate } = require('../middleware/auth');
const { validateGameCreation } = require('../middleware/validation.middleware');

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

// Add a test endpoint to your game routes
router.get('/test', (req, res) => {
  res.json({ message: 'Game routes test endpoint is working' });
});

module.exports = router; 