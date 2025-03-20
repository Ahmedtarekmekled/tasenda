const path = require("path");
const Game = require(path.join(__basedir, "src/models/game.model.js"));

// Create a local io variable that will be set by setIo function
let io = null;

// Add a function to set io after initialization to break circular dependency
const setIo = (socketIo) => {
  io = socketIo;
};

/**
 * Emits game state updates to all players in a game room
 * @param {string} gameId - The ID of the game
 * @param {Object} gameState - Optional game state to send (if not provided, fetches from DB)
 */
const emitGameUpdate = async (gameId, gameState = null) => {
  try {
    // If gameState is not provided, fetch it from the database
    if (!gameState) {
      const game = await Game.findById(gameId)
        .populate("players.user", "name email")
        .populate("creator", "name email");

      if (!game) {
        console.error(`[GAME EVENTS] Game not found for update: ${gameId}`);
        return false;
      }

      gameState = game.gameState;
    }

    console.log(
      `[GAME EVENTS] Broadcasting game update to all players in room ${gameId}`
    );
    console.log(`[GAME EVENTS] Current board state:`, gameState.board);
    console.log(
      `[GAME EVENTS] Current player index:`,
      gameState.currentPlayerIndex
    );

    // Use io.to instead of socket.to to ensure all clients including sender get updates
    io.to(gameId).emit("game-state", {
      gameId,
      gameState,
    });

    return true;
  } catch (error) {
    console.error("[GAME EVENTS] Error emitting game update:", error);
    return false;
  }
};

/**
 * Initializes a tic-tac-toe game when both players have joined
 * @param {Object} game - The game document
 * @returns {Object} Updated game state
 */
const initializeTicTacToeGame = async (game) => {
  try {
    if (!game || game.players.length < 2) {
      console.log("[GAME EVENTS] Cannot initialize game - not enough players");
      return null;
    }

    // Store the existing scores before initializing
    const existingScores = game.gameState?.scores || {};

    // If no existing scores, try to find scores from previous games between these players
    if (Object.keys(existingScores).length === 0) {
      const player1Id = game.players[0].user._id.toString();
      const player2Id = game.players[1].user._id.toString();

      try {
        const previousGames = await Game.find({
          gameType: "tic-tac-toe",
          "players.user": { $all: [player1Id, player2Id] },
          _id: { $ne: game._id.toString() }, // Exclude current game
        })
          .sort({ createdAt: -1 })
          .limit(1);

        if (
          previousGames.length > 0 &&
          previousGames[0].gameState &&
          previousGames[0].gameState.scores
        ) {
          console.log("[GAME EVENTS] Found previous game with scores");
          Object.assign(existingScores, previousGames[0].gameState.scores);
        }
      } catch (err) {
        console.error("[GAME EVENTS] Error finding previous games:", err);
      }
    }

    // Initialize the game state if it doesn't exist
    if (!game.gameState) {
      game.gameState = {};
    }

    // Set up the initial game state
    game.gameState.board = Array(9).fill("");
    game.gameState.moveHistory = [];
    game.gameState.phase = "playing";
    game.gameState.isDraw = false;
    game.gameState.winner = null;

    // Randomly determine who goes first (0 or 1)
    game.gameState.currentPlayerIndex = Math.floor(Math.random() * 2);
    game.gameState.currentPlayer =
      game.players[game.gameState.currentPlayerIndex].user._id;

    // CRITICAL: Preserve the existing scores
    game.gameState.scores = existingScores;

    console.log(
      `[GAME EVENTS] Initialized TicTacToe game: ${game._id} with preserved scores:`,
      game.gameState.scores
    );
    console.log(
      `[GAME EVENTS] First turn: Player ${
        game.gameState.currentPlayerIndex + 1
      } (${game.gameState.currentPlayer})`
    );

    // Save the updated game
    await game.save();

    // Emit the game update to all players
    await emitGameUpdate(game._id.toString(), game.gameState);

    return game.gameState;
  } catch (error) {
    console.error("[GAME EVENTS] Error initializing tic-tac-toe game:", error);
    return null;
  }
};

/**
 * Check if a player has won the game
 * @param {Array} board - The game board
 * @param {string} symbol - The player's symbol (X or O)
 * @returns {boolean} True if the player has won, false otherwise
 */
const checkWin = (board, symbol) => {
  const winPatterns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8], // rows
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8], // columns
    [0, 4, 8],
    [2, 4, 6], // diagonals
  ];

  return winPatterns.some((pattern) =>
    pattern.every((position) => board[position] === symbol)
  );
};

/**
 * Check if the game is a draw
 * @param {Array} board - The game board
 * @returns {boolean} True if the game is a draw, false otherwise
 */
const checkDraw = (board) => {
  return board.every((cell) => cell !== "" && cell !== null);
};

module.exports = {
  emitGameUpdate,
  initializeTicTacToeGame,
  checkWin,
  checkDraw,
  setIo, // Export this function to be called after io is initialized
};
