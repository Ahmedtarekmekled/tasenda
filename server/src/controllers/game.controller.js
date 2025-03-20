const Game = require('../models/game.model');
const User = require('../models/user.model');
const { v4: uuidv4 } = require('uuid');
const { emitGameUpdate } = require('../socket/socket');

/**
 * Create a new game
 * @route POST /api/games
 * @access Private
 */
const createGame = async (req, res) => {
  try {
    const { title, description, maxPlayers, gameType, settings } = req.body;
    const userId = req.user.id;

    console.log('Create game request:', {
      title,
      description,
      maxPlayers,
      gameType,
      settings
    });

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: 'Game title is required' });
    }

    if (!gameType) {
      return res.status(400).json({ message: 'Game type is required' });
    }

    // Validate game type
    const validGameTypes = ['word-guess', 'trivia', 'tic-tac-toe'];
    if (!validGameTypes.includes(gameType)) {
      console.error(`Invalid game type: ${gameType}. Valid types are: ${validGameTypes.join(', ')}`);
      return res.status(400).json({ 
        message: `Invalid game type: ${gameType}. Valid types are: ${validGameTypes.join(', ')}` 
      });
    }

    // Create a new game
    const game = new Game({
      title,
      description: description || '',
      creator: userId,
      maxPlayers: maxPlayers || 4,
      gameType,
      inviteCode: uuidv4().substring(0, 8),
      players: [{ user: userId, role: 'host', joinedAt: new Date() }],
      settings: settings || {}
    });

    await game.save();

    // Populate creator and players
    await game.populate('creator', 'name email');
    await game.populate('players.user', 'name email');

    console.log('Game created successfully:', game._id.toString());

    res.status(201).json({
      message: 'Game created successfully',
      game
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
};

/**
 * Get all games created by the user
 * @route GET /api/games
 * @access Private
 */
const getUserGames = async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log('Fetching games for user:', userId);

    // Debug: Check if Game model is working
    const allGames = await Game.find({});
    console.log(`Total games in database: ${allGames.length}`);

    // Find games where the user is either the creator or a player
    const games = await Game.find({
      $or: [
        { creator: userId },
        { 'players.user': userId }
      ]
    })
    .populate('creator', 'name email')
    .populate('players.user', 'name email')
    .sort({ createdAt: -1 });
    
    console.log(`Found ${games.length} games for user ${userId}`);

    // Return the correct response structure
    res.json({
      message: 'Games retrieved successfully',
      games: games // Make sure we're returning an array of games
    });
  } catch (error) {
    console.error('Error getting user games:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get game by ID
 * @route GET /api/games/:id
 * @access Private
 */
const getGameById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Find the game by ID and populate creator and players
    const game = await Game.findById(id)
      .populate('creator', 'name email')
      .populate('players.user', 'name email');

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Check if user is the creator or a player in the game
    const isCreator = game.creator._id.toString() === userId;
    
    // Handle case where player.user might be null (if a user was deleted)
    const isPlayer = game.players.some(player => 
      player.user && player.user._id && player.user._id.toString() === userId
    );

    // If the user is not the creator or a player, check if the game is in 'waiting' status
    // to allow them to join
    if (!isCreator && !isPlayer) {
      // If the game is in waiting status, return limited info to allow joining
      if (game.status === 'waiting') {
        return res.json({
          message: 'Game retrieved successfully',
          game: {
            _id: game._id,
            title: game.title,
            description: game.description,
            gameType: game.gameType,
            status: game.status,
            maxPlayers: game.maxPlayers,
            players: game.players,
            creator: game.creator,
            inviteCode: game.inviteCode,
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
            canJoin: true
          }
        });
      }
      
      return res.status(403).json({ 
        message: 'You do not have permission to access this game' 
      });
    }

    // Add a flag to indicate if the current user is the creator
    const gameWithPermissions = {
      ...game.toObject(),
      isCreator,
      isPlayer
    };

    res.json({
      message: 'Game retrieved successfully',
      game: gameWithPermissions
    });
  } catch (error) {
    console.error('Error getting game by ID:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Join a game using invite code
 * @route POST /api/games/join/:inviteCode
 * @access Private
 */
const joinGame = async (req, res) => {
  try {
    const { inviteCode } = req.params;
    const userId = req.user.id;

    // Find the game by invite code
    const game = await Game.findOne({ inviteCode });

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Check if the game is already in progress or completed
    if (game.status !== 'waiting') {
      return res.status(400).json({ message: `Cannot join a game that is ${game.status}` });
    }

    // Check if the user is already in the game
    const isAlreadyInGame = game.players.some(player => 
      player.user.toString() === userId
    );

    if (isAlreadyInGame) {
      return res.status(400).json({ message: 'You are already in this game' });
    }

    // Check if the game is full
    if (game.players.length >= game.maxPlayers) {
      return res.status(400).json({ message: 'Game is full' });
    }

    // Add the user to the game
    game.players.push({
      user: userId,
      role: 'player',
      joinedAt: new Date()
    });

    await game.save();

    // Populate creator and players for the response
    await game.populate('creator', 'name email');
    await game.populate('players.user', 'name email');

    // Emit socket event for real-time updates
    emitGameUpdate(req.app.get('io'), game._id.toString(), game);

    // Check if we should auto-start the game (for word-guess when 2+ players join)
    if (game.gameType === 'word-guess' && game.players.length >= 2 && game.status === 'waiting') {
      // Auto-start the game
      game.status = 'in-progress';
      await game.save();
      
      // Initialize the game
      const { initializeGame } = require('../socket/socket');
      await initializeGame(req.app.get('io'), game._id.toString());
    }

    res.json({
      message: 'Joined game successfully',
      game
    });
  } catch (error) {
    console.error('Error joining game:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Get game by invite code (for checking if game exists before joining)
 * @route GET /api/games/invite/:inviteCode
 * @access Public
 */
const getGameByInviteCode = async (req, res) => {
  try {
    const { inviteCode } = req.params;

    const game = await Game.findOne({ inviteCode })
      .populate('creator', 'name')
      .select('title gameType status players maxPlayers createdAt');

    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found or invalid invite code'
      });
    }

    // Return limited info for public access
    res.status(200).json({
      success: true,
      data: {
        game: {
          id: game._id,
          title: game.title,
          gameType: game.gameType,
          status: game.status,
          playerCount: game.players.length,
          maxPlayers: game.maxPlayers,
          creator: game.creator.name,
          createdAt: game.createdAt
        }
      }
    });
  } catch (error) {
    console.error('Get game by invite code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching game'
    });
  }
};

/**
 * Update game status
 * @route PATCH /api/games/:id/status
 * @access Private
 */
const updateGameStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user.id;

    // Validate status
    const validStatuses = ['waiting', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid game status' });
    }

    const game = await Game.findById(id);

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Debug logs
    console.log('User ID from token:', userId);
    console.log('Game creator ID:', game.creator.toString());
    console.log('Are they equal?', game.creator.toString() === userId);

    // Only the creator can update the game status
    // Convert both IDs to strings for comparison
    if (game.creator.toString() !== userId) {
      return res.status(403).json({ message: 'Only the game host can update the game status' });
    }

    // Additional validation for status transitions
    if (game.status === 'completed' || game.status === 'cancelled') {
      return res.status(400).json({ message: 'Cannot update status of a completed or cancelled game' });
    }

    if (status === 'in-progress' && game.players.length < 2) {
      return res.status(400).json({ message: 'At least 2 players are required to start the game' });
    }

    // If transitioning to in-progress, initialize the game
    if (status === 'in-progress' && game.status === 'waiting') {
      // Initialize game state based on game type
      const { initializeGame } = require('../socket/socket');
      await initializeGame(req.app.get('io'), game._id.toString());
    }

    game.status = status;
    await game.save();

    // Populate creator and players for the response
    await game.populate('creator', 'name email');
    await game.populate('players.user', 'name email');

    // Emit socket event for real-time updates
    emitGameUpdate(req.app.get('io'), game._id.toString(), game);

    res.json({
      message: 'Game status updated successfully',
      game
    });
  } catch (error) {
    console.error('Error updating game status:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Leave a game
 * @route POST /api/games/:id/leave
 * @access Private
 */
const leaveGame = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const game = await Game.findById(id);

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Check if the user is in the game
    const playerIndex = game.players.findIndex(player => 
      player.user.toString() === userId
    );

    if (playerIndex === -1) {
      return res.status(400).json({ message: 'You are not in this game' });
    }

    // Check if the user is the host
    const isHost = game.players[playerIndex].role === 'host';

    if (isHost) {
      // If the host leaves, cancel the game
      game.status = 'cancelled';
    } else {
      // Otherwise, just remove the player
      game.players.splice(playerIndex, 1);
    }

    await game.save();

    // Populate creator and players for the response
    await game.populate('creator', 'name email');
    await game.populate('players.user', 'name email');

    // Emit socket event for real-time updates
    emitGameUpdate(req.app.get('io'), game._id.toString(), game);

    res.json({
      message: isHost ? 'Game cancelled' : 'Left game successfully',
      game
    });
  } catch (error) {
    console.error('Error leaving game:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createGame,
  getUserGames,
  getGameById,
  joinGameByInviteCode: joinGame,
  getGameByInviteCode,
  updateGameStatus,
  leaveGame
}; 