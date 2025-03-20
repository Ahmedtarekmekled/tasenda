/**
 * Game Service
 * Handles game logic for different game types
 */

// Initialize game state based on game type
const initializeGameState = (game) => {
  switch (game.gameType) {
    case 'tic-tac-toe':
      return initializeTicTacToe(game);
    case 'word-guess':
      return initializeWordGuess(game);
    case 'trivia':
      return initializeTrivia(game);
    default:
      return {};
  }
};

// Process game action based on game type
const processGameAction = async (game, userId, action, data) => {
  switch (game.gameType) {
    case 'tic-tac-toe':
      return processTicTacToeAction(game, userId, action, data);
    case 'word-guess':
      return processWordGuessAction(game, userId, action, data);
    case 'trivia':
      return processTriviaAction(game, userId, action, data);
    default:
      return {
        success: false,
        message: 'Unsupported game type'
      };
  }
};

// Tic-Tac-Toe Game Logic
const initializeTicTacToe = (game) => {
  // Create player mapping
  const players = game.players.map(player => ({
    id: player.user._id.toString(),
    name: player.user.name || 'Player',
    symbol: null
  }));
  
  // Assign X to first player, O to second player
  players[0].symbol = 'X';
  players[1].symbol = 'O';
  
  return {
    board: Array(9).fill(null),
    players,
    currentPlayerIndex: 0,
    winner: null,
    winningLine: null
  };
};

const processTicTacToeAction = (game, userId, action, data) => {
  if (action !== 'make-move') {
    return {
      success: false,
      message: 'Invalid action for Tic-Tac-Toe'
    };
  }
  
  const { position } = data;
  const gameState = { ...game.gameState };
  
  // Validate position
  if (position < 0 || position > 8) {
    return {
      success: false,
      message: 'Invalid position'
    };
  }
  
  // Check if position is already taken
  if (gameState.board[position] !== null) {
    return {
      success: false,
      message: 'Position already taken'
    };
  }
  
  // Find current player
  const currentPlayerIndex = gameState.currentPlayerIndex;
  const currentPlayer = gameState.players[currentPlayerIndex];
  
  // Make sure it's the player's turn
  if (currentPlayer.id !== userId) {
    return {
      success: false,
      message: 'Not your turn'
    };
  }
  
  // Make the move
  gameState.board[position] = currentPlayer.symbol;
  
  // Check for winner
  const winResult = checkTicTacToeWinner(gameState.board);
  
  if (winResult.winner) {
    gameState.winner = winResult.winner;
    gameState.winningLine = winResult.line;
    
    // Update player scores
    const winningPlayer = gameState.players.find(p => p.symbol === winResult.winner);
    if (winningPlayer) {
      const playerIndex = game.players.findIndex(p => p.user.toString() === winningPlayer.id);
      if (playerIndex !== -1) {
        game.players[playerIndex].score += 10;
      }
    }
    
    return {
      success: true,
      gameState,
      nextTurn: null,
      gameCompleted: true,
      winner: winResult.winner === 'X' ? gameState.players[0].id : gameState.players[1].id
    };
  }
  
  // Check for draw
  if (!gameState.board.includes(null)) {
    gameState.winner = 'draw';
    
    return {
      success: true,
      gameState,
      nextTurn: null,
      gameCompleted: true,
      winner: 'draw'
    };
  }
  
  // Switch turns
  gameState.currentPlayerIndex = (currentPlayerIndex + 1) % 2;
  const nextPlayer = gameState.players[gameState.currentPlayerIndex];
  
  return {
    success: true,
    gameState,
    nextTurn: nextPlayer.id,
    gameCompleted: false
  };
};

const checkTicTacToeWinner = (board) => {
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return {
        winner: board[a],
        line: lines[i]
      };
    }
  }
  
  return {
    winner: null,
    line: null
  };
};

// Word Guess Game Logic
const initializeWordGuess = (game) => {
  // List of words for the game
  const wordList = [
    'javascript', 'react', 'node', 'express', 'mongodb',
    'algorithm', 'database', 'frontend', 'backend', 'fullstack',
    'developer', 'programming', 'interface', 'component', 'function',
    'variable', 'constant', 'object', 'array', 'promise',
    'async', 'await', 'callback', 'middleware', 'router'
  ];
  
  // Select a random word
  const randomWord = wordList[Math.floor(Math.random() * wordList.length)];
  
  // Create player mapping
  const players = game.players.map(player => ({
    id: player.user._id.toString(),
    name: player.user.name || 'Player',
    score: 0,
    guessedLetters: []
  }));
  
  return {
    word: randomWord,
    displayWord: '_'.repeat(randomWord.length),
    guessedLetters: [],
    incorrectGuesses: 0,
    maxIncorrectGuesses: 6,
    players,
    currentPlayerIndex: 0,
    winner: null,
    gameOver: false,
    hints: []
  };
};

const processWordGuessAction = (game, userId, action, data) => {
  if (!['guess-letter', 'guess-word', 'provide-hint'].includes(action)) {
    return {
      success: false,
      message: 'Invalid action for Word Guess'
    };
  }
  
  const gameState = { ...game.gameState };
  
  // Find current player
  const currentPlayerIndex = gameState.currentPlayerIndex;
  const currentPlayer = gameState.players[currentPlayerIndex];
  
  // Make sure it's the player's turn
  if (currentPlayer.id !== userId) {
    return {
      success: false,
      message: 'Not your turn'
    };
  }
  
  // Check if game is already over
  if (gameState.gameOver) {
    return {
      success: false,
      message: 'Game is already over'
    };
  }
  
  let nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length;
  let nextTurn = gameState.players[nextPlayerIndex].id;
  let gameCompleted = false;
  let winner = null;
  
  if (action === 'guess-letter') {
    const { letter } = data;
    
    // Validate letter
    if (!letter || letter.length !== 1 || !/[a-z]/i.test(letter)) {
      return {
        success: false,
        message: 'Invalid letter'
      };
    }
    
    const lowerLetter = letter.toLowerCase();
    
    // Check if letter was already guessed
    if (gameState.guessedLetters.includes(lowerLetter)) {
      return {
        success: false,
        message: 'Letter already guessed'
      };
    }
    
    // Add letter to guessed letters
    gameState.guessedLetters.push(lowerLetter);
    currentPlayer.guessedLetters.push(lowerLetter);
    
    // Check if letter is in the word
    if (gameState.word.includes(lowerLetter)) {
      // Update display word
      let newDisplayWord = '';
      for (let i = 0; i < gameState.word.length; i++) {
        if (gameState.word[i] === lowerLetter) {
          newDisplayWord += lowerLetter;
        } else {
          newDisplayWord += gameState.displayWord[i];
        }
      }
      gameState.displayWord = newDisplayWord;
      
      // Award points to the player
      currentPlayer.score += 10;
      
      // Update player score in the game
      const gamePlayerIndex = game.players.findIndex(p => p.user.toString() === userId);
      if (gamePlayerIndex !== -1) {
        game.players[gamePlayerIndex].score += 10;
      }
      
      // Check if word is completely guessed
      if (!gameState.displayWord.includes('_')) {
        gameState.gameOver = true;
        gameState.winner = userId;
        gameCompleted = true;
        winner = userId;
      }
    } else {
      // Incorrect guess
      gameState.incorrectGuesses++;
      
      // Check if max incorrect guesses reached
      if (gameState.incorrectGuesses >= gameState.maxIncorrectGuesses) {
        gameState.gameOver = true;
        gameCompleted = true;
      }
    }
  } else if (action === 'guess-word') {
    const { word } = data;
    
    // Validate word
    if (!word || typeof word !== 'string') {
      return {
        success: false,
        message: 'Invalid word'
      };
    }
    
    const lowerWord = word.toLowerCase();
    
    // Check if word is correct
    if (lowerWord === gameState.word) {
      // Word is correct
      gameState.displayWord = gameState.word;
      gameState.gameOver = true;
      gameState.winner = userId;
      
      // Award points to the player
      currentPlayer.score += 50;
      
      // Update player score in the game
      const gamePlayerIndex = game.players.findIndex(p => p.user.toString() === userId);
      if (gamePlayerIndex !== -1) {
        game.players[gamePlayerIndex].score += 50;
      }
      
      gameCompleted = true;
      winner = userId;
    } else {
      // Word is incorrect
      gameState.incorrectGuesses++;
      
      // Check if max incorrect guesses reached
      if (gameState.incorrectGuesses >= gameState.maxIncorrectGuesses) {
        gameState.gameOver = true;
        gameCompleted = true;
      }
    }
  } else if (action === 'provide-hint') {
    const { hint } = data;
    
    // Validate hint
    if (!hint || typeof hint !== 'string' || hint.length < 2) {
      return {
        success: false,
        message: 'Invalid hint'
      };
    }
    
    // Add hint
    gameState.hints.push({
      playerId: userId,
      playerName: currentPlayer.name,
      hint
    });
  }
  
  // Game continues
  return {
    success: true,
    gameState,
    nextTurn,
    gameCompleted,
    winner
  };
};

// Trivia Game Logic
const initializeTrivia = (game) => {
  // Sample trivia questions
  const questions = [
    {
      question: 'What is the capital of France?',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correctAnswer: 2
    },
    {
      question: 'Which planet is known as the Red Planet?',
      options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
      correctAnswer: 1
    },
    {
      question: 'What is the largest mammal?',
      options: ['Elephant', 'Giraffe', 'Blue Whale', 'Hippopotamus'],
      correctAnswer: 2
    },
    {
      question: 'Who painted the Mona Lisa?',
      options: ['Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Michelangelo'],
      correctAnswer: 2
    },
    {
      question: 'What is the chemical symbol for gold?',
      options: ['Go', 'Gd', 'Au', 'Ag'],
      correctAnswer: 2
    }
  ];
  
  // Choose a random question
  const questionIndex = Math.floor(Math.random() * questions.length);
  
  // Create player mapping
  const players = game.players.map(player => ({
    id: player.user._id.toString(),
    name: player.user.name || 'Player',
    score: 0,
    answered: false
  }));
  
  return {
    questions,
    currentQuestionIndex: questionIndex,
    currentQuestion: questions[questionIndex],
    players,
    currentPlayerIndex: 0,
    answers: {},
    roundComplete: false,
    winner: null
  };
};

const processTriviaAction = (game, userId, action, data) => {
  if (action !== 'submit-answer') {
    return {
      success: false,
      message: 'Invalid action for Trivia'
    };
  }
  
  const { answerIndex } = data;
  const gameState = { ...game.gameState };
  
  // Validate answer
  if (answerIndex === undefined || answerIndex < 0 || answerIndex >= gameState.currentQuestion.options.length) {
    return {
      success: false,
      message: 'Invalid answer'
    };
  }
  
  // Find player
  const playerIndex = gameState.players.findIndex(p => p.id === userId);
  
  if (playerIndex === -1) {
    return {
      success: false,
      message: 'Player not found'
    };
  }
  
  // Check if player already answered
  if (gameState.answers[userId]) {
    return {
      success: false,
      message: 'You have already answered this question'
    };
  }
  
  // Record player's answer
  gameState.answers[userId] = answerIndex;
  gameState.players[playerIndex].answered = true;
  
  // Check if answer is correct
  if (answerIndex === gameState.currentQuestion.correctAnswer) {
    // Award points to the player
    gameState.players[playerIndex].score += 10;
    
    // Update player score in the game
    const gamePlayerIndex = game.players.findIndex(p => p.user.toString() === userId);
    if (gamePlayerIndex !== -1) {
      game.players[gamePlayerIndex].score += 10;
    }
  }
  
  // Check if all players have answered
  const allAnswered = gameState.players.every(p => p.answered);
  
  if (allAnswered) {
    // Move to next question
    gameState.roundComplete = true;
    
    // Check if we've gone through all questions
    if (gameState.currentQuestionIndex >= gameState.questions.length - 1) {
      // Find player with highest score
      let highestScore = -1;
      let winnerId = null;
      
      for (const player of gameState.players) {
        if (player.score > highestScore) {
          highestScore = player.score;
          winnerId = player.id;
        }
      }
      
      gameState.winner = winnerId;
      
      return {
        success: true,
        gameState,
        nextTurn: null,
        gameCompleted: true,
        winner: winnerId
      };
    } else {
      // Prepare for next question
      gameState.currentQuestionIndex++;
      gameState.currentQuestion = gameState.questions[gameState.currentQuestionIndex];
      gameState.roundComplete = false;
      gameState.answers = {};
      
      // Reset player answered status
      for (const player of gameState.players) {
        player.answered = false;
      }
    }
  }
  
  // Game continues
  return {
    success: true,
    gameState,
    nextTurn: userId, // Keep the same player's turn until all have answered
    gameCompleted: false
  };
};

module.exports = {
  initializeGameState,
  processGameAction
}; 