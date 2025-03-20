const Game = require('../models/game.model');
const { emitGameUpdate } = require('../socket/socket');

// Initialize the game when it starts
const initializeQuestionGuessGame = async (gameId) => {
  try {
    console.log(`Initializing Question Guess game: ${gameId}`);
    
    const game = await Game.findById(gameId);
    
    if (!game) {
      return { success: false, message: 'Game not found' };
    }
    
    if (game.gameType !== 'question-guess') {
      return { success: false, message: 'Invalid game type' };
    }
    
    if (game.players.length < 2) {
      return { success: false, message: 'Need at least 2 players to start' };
    }
    
    // Get settings from game or use defaults
    const rounds = game.settings?.rounds || 5;
    
    // Initialize game state
    const gameState = {
      rounds: rounds,
      currentRound: 1,
      scores: {},
      phase: 'word-selection', // word-selection, questioning, guessing, results
      secretWord: '',
      hints: [],
      questions: [],
      guesses: [],
      roundHistory: [],
      // Randomly select first word selector and guesser
      wordSelector: game.players[0].user.toString(),
      guesser: game.players[1].user.toString(),
      currentTurn: game.players[0].user.toString() // Start with word selector
    };
    
    // Initialize scores for all players
    game.players.forEach(player => {
      gameState.scores[player.user.toString()] = 0;
    });
    
    // Save game state
    game.gameState = gameState;
    await game.save();
    
    console.log(`Game initialized successfully: ${gameId}`);
    console.log('Initial game state:', JSON.stringify(gameState, null, 2));
    
    return { 
      success: true, 
      game,
      message: 'Game initialized successfully' 
    };
  } catch (error) {
    console.error('Error initializing Question Guess game:', error);
    return { success: false, message: 'Server error' };
  }
};

// Submit a secret word and hints
const submitSecretWord = async (gameId, userId, word, hints) => {
  try {
    const game = await Game.findById(gameId);
    
    if (!game || game.gameType !== 'question-guess') {
      return { success: false, message: 'Invalid game' };
    }
    
    if (game.gameState.currentTurn !== userId) {
      return { success: false, message: 'Not your turn' };
    }
    
    if (game.gameState.phase !== 'word-selection') {
      return { success: false, message: 'Invalid game phase' };
    }
    
    // Validate word and hints
    if (!word || !hints || hints.length !== 2) {
      return { success: false, message: 'Please provide a word and 2 hints' };
    }
    
    // Update game state
    game.gameState.secretWord = word.toLowerCase().trim();
    game.gameState.hints = hints;
    game.gameState.phase = 'questioning';
    
    // Find the next player (the guesser)
    const currentPlayerIndex = game.players.findIndex(
      player => player.user.toString() === userId
    );
    const nextPlayerIndex = (currentPlayerIndex + 1) % game.players.length;
    game.gameState.guesser = game.players[nextPlayerIndex].user.toString();
    
    await game.save();
    
    return { success: true, game };
  } catch (error) {
    console.error('Error submitting secret word:', error);
    return { success: false, message: 'Server error' };
  }
};

// Submit a question
const submitQuestion = async (gameId, userId, question) => {
  try {
    const game = await Game.findById(gameId);
    
    if (!game || game.gameType !== 'question-guess') {
      return { success: false, message: 'Invalid game' };
    }
    
    if (game.gameState.guesser !== userId) {
      return { success: false, message: 'Not your turn to ask questions' };
    }
    
    if (game.gameState.phase !== 'questioning') {
      return { success: false, message: 'Invalid game phase' };
    }
    
    // Check if max questions reached
    if (game.gameState.questions.length >= 10) {
      return { success: false, message: 'Maximum questions reached' };
    }
    
    // Add question to the list (without answer yet)
    game.gameState.questions.push({
      text: question,
      answer: null,
      askedBy: userId
    });
    
    await game.save();
    
    return { success: true, game };
  } catch (error) {
    console.error('Error submitting question:', error);
    return { success: false, message: 'Server error' };
  }
};

// Answer a question
const answerQuestion = async (gameId, userId, questionIndex, answer) => {
  try {
    const game = await Game.findById(gameId);
    
    if (!game || game.gameType !== 'question-guess') {
      return { success: false, message: 'Invalid game' };
    }
    
    if (game.gameState.currentTurn !== userId) {
      return { success: false, message: 'Not your turn to answer questions' };
    }
    
    if (game.gameState.phase !== 'questioning') {
      return { success: false, message: 'Invalid game phase' };
    }
    
    // Validate question index
    if (questionIndex < 0 || questionIndex >= game.gameState.questions.length) {
      return { success: false, message: 'Invalid question index' };
    }
    
    // Update the answer
    game.gameState.questions[questionIndex].answer = answer ? 'yes' : 'no';
    
    await game.save();
    
    return { success: true, game };
  } catch (error) {
    console.error('Error answering question:', error);
    return { success: false, message: 'Server error' };
  }
};

// Submit a guess
const submitGuess = async (gameId, userId, guess) => {
  try {
    const game = await Game.findById(gameId);
    
    if (!game || game.gameType !== 'question-guess') {
      return { success: false, message: 'Invalid game' };
    }
    
    if (game.gameState.guesser !== userId) {
      return { success: false, message: 'Not your turn to guess' };
    }
    
    if (game.gameState.phase !== 'questioning' && game.gameState.phase !== 'guessing') {
      return { success: false, message: 'Invalid game phase' };
    }
    
    // Check if max guesses reached
    if (game.gameState.guesses.length >= 3) {
      return { success: false, message: 'Maximum guesses reached' };
    }
    
    // Add guess to the list
    const normalizedGuess = guess.toLowerCase().trim();
    const isCorrect = normalizedGuess === game.gameState.secretWord;
    
    game.gameState.guesses.push({
      text: normalizedGuess,
      isCorrect,
      guessedBy: userId
    });
    
    // Calculate score if correct or if this is the last guess
    if (isCorrect || game.gameState.guesses.length === 3) {
      // Calculate score based on attempt number
      let points = 0;
      if (isCorrect) {
        const attemptNumber = game.gameState.guesses.length;
        switch (attemptNumber) {
          case 1: points = 3; break;
          case 2: points = 2; break;
          case 3: points = 1; break;
        }
        
        // Add bonus for unused questions
        const unusedQuestions = 10 - game.gameState.questions.length;
        points += unusedQuestions * 0.1;
      }
      
      // Update score
      game.gameState.scores[userId] += points;
      
      // Move to next round or end game
      game.gameState.roundHistory.push({
        round: game.gameState.currentRound,
        secretWord: game.gameState.secretWord,
        hints: game.gameState.hints,
        questions: game.gameState.questions,
        guesses: game.gameState.guesses,
        wordSelector: game.gameState.wordSelector,
        guesser: game.gameState.guesser,
        points
      });
      
      // Check if game is over
      if (game.gameState.currentRound >= game.gameState.rounds) {
        game.gameState.phase = 'results';
        game.status = 'completed';
      } else {
        // Switch roles and start next round
        game.gameState.currentRound += 1;
        game.gameState.phase = 'word-selection';
        
        // Switch turns
        const temp = game.gameState.wordSelector;
        game.gameState.wordSelector = game.gameState.guesser;
        game.gameState.guesser = temp;
        
        // Reset round data
        game.gameState.secretWord = '';
        game.gameState.hints = [];
        game.gameState.questions = [];
        game.gameState.guesses = [];
      }
    }
    
    await game.save();
    
    return { success: true, game, isCorrect };
  } catch (error) {
    console.error('Error submitting guess:', error);
    return { success: false, message: 'Server error' };
  }
};

module.exports = {
  initializeQuestionGuessGame,
  submitSecretWord,
  submitQuestion,
  answerQuestion,
  submitGuess
}; 