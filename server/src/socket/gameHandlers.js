const Game = require('../models/game.model');
const User = require('../models/user.model');
const wordList = require('../utils/wordList');

// Get a random word for the game
const getRandomWord = () => {
  const randomIndex = Math.floor(Math.random() * wordList.length);
  return wordList[randomIndex];
};

// Initialize game data for a new game
const initializeGameData = async (game) => {
  // Create initial game state
  const gameData = {
    currentRound: 0,
    rounds: [],
    currentTurn: null,
    scores: {},
    status: 'waiting',
    word: '',
    hints: [],
    guesses: []
  };

  // Initialize scores for all players
  game.players.forEach(player => {
    gameData.scores[player.user.toString()] = {
      name: '', // Will be populated when we fetch user details
      points: 0
    };
  });

  // Fetch player names
  const playerIds = game.players.map(player => player.user);
  const users = await User.find({ _id: { $in: playerIds } }, 'name');
  
  // Update player names in scores
  users.forEach(user => {
    if (gameData.scores[user._id.toString()]) {
      gameData.scores[user._id.toString()].name = user.name;
    }
  });

  return gameData;
};

// Handle game actions
const handleGameAction = async (io, socket, data) => {
  const { gameId, action, data: actionData } = data;
  
  try {
    // Get the game
    const game = await Game.findById(gameId).populate('players.user', 'name');
    
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    // Initialize gameData if it doesn't exist
    if (!game.gameData) {
      game.gameData = await initializeGameData(game);
      await game.save();
    }

    // Handle different game actions
    switch (action) {
      case 'start-round':
        await handleStartRound(io, game, actionData);
        break;
      
      case 'end-round':
        await handleEndRound(io, game, actionData);
        break;
      
      case 'submit-hint':
        await handleSubmitHint(io, game, actionData);
        break;
      
      case 'submit-guess':
        await handleSubmitGuess(io, game, socket.user.id, actionData);
        break;
      
      default:
        socket.emit('error', { message: 'Invalid game action' });
    }
  } catch (error) {
    console.error('Error handling game action:', error);
    socket.emit('error', { message: 'Error processing game action' });
  }
};

// Handle starting a new round
const handleStartRound = async (io, game, actionData) => {
  const { roundNumber } = actionData;
  
  // Select a random word
  const word = getRandomWord();
  
  // Update game data
  game.gameData.currentRound = roundNumber;
  game.gameData.word = word;
  game.gameData.hints = [];
  game.gameData.guesses = [];
  game.gameData.status = 'in-progress';
  
  // Save the updated game
  await game.save();
  
  // Notify all players
  io.to(`game:${game._id}`).emit('game-update', {
    action: 'new-round',
    data: {
      roundNumber,
      currentTurn: game.creator.toString(),
      word
    }
  });
};

// Handle ending a round
const handleEndRound = async (io, game, actionData) => {
  const { roundNumber } = actionData;
  
  // Update game data
  game.gameData.status = 'round-end';
  
  // Save the updated game
  await game.save();
  
  // Notify all players
  io.to(`game:${game._id}`).emit('game-update', {
    action: 'round-end',
    data: {
      roundNumber,
      scores: game.gameData.scores,
      word: game.gameData.word
    }
  });
};

// Handle submitting a hint
const handleSubmitHint = async (io, game, actionData) => {
  const { hint } = actionData;
  
  // Add hint to the game data
  game.gameData.hints.push(hint);
  
  // Save the updated game
  await game.save();
  
  // Notify all players
  io.to(`game:${game._id}`).emit('game-update', {
    action: 'new-hint',
    data: {
      hint
    }
  });
};

// Handle submitting a guess
const handleSubmitGuess = async (io, game, playerId, actionData) => {
  const { guess, playerName } = actionData;
  
  // Create guess object
  const guessData = {
    playerId,
    playerName,
    guess,
    timestamp: new Date().toISOString(),
    isCorrect: guess.toLowerCase() === game.gameData.word.toLowerCase()
  };
  
  // Add guess to the game data
  game.gameData.guesses.push(guessData);
  
  // Check if the guess is correct
  if (guessData.isCorrect) {
    // Award points to the player
    game.gameData.scores[playerId].points += 10;
    
    // Update game status
    game.gameData.status = 'round-end';
  }
  
  // Save the updated game
  await game.save();
  
  // Notify all players about the new guess
  io.to(`game:${game._id}`).emit('game-update', {
    action: 'new-guess',
    data: {
      playerId,
      playerName,
      guess
    }
  });
  
  // If the guess was correct, notify about the correct guess
  if (guessData.isCorrect) {
    io.to(`game:${game._id}`).emit('game-update', {
      action: 'correct-guess',
      data: {
        playerId,
        playerName,
        scores: game.gameData.scores
      }
    });
  }
};

module.exports = {
  handleGameAction,
  initializeGameData
}; 