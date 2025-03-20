const path = require("path");
const Game = require(path.join(__basedir, "src/models/game.model.js"));
const {
  emitGameUpdate,
  initializeTicTacToeGame,
  checkWin,
  checkDraw,
} = require("../utils/gameEvents");

// Initialize a new round
const initializeNewRound = (game) => {
  // Initialize the board as a flat array for better MongoDB compatibility
  game.gameState.board = ["", "", "", "", "", "", "", "", ""];
  game.gameState.winner = null;
  game.gameState.isDraw = false;
  game.gameState.moveHistory = [];

  // Alternate who goes first each round
  const players = game.players.map((p) => p.user._id.toString());
  const currentPlayerIndex = game.gameState.round % 2;
  game.gameState.currentPlayer = players[currentPlayerIndex];

  game.gameState.phase = "playing";

  return game;
};

// Setup Tic Tac Toe socket handlers
const setupTicTacToeHandlers = (io, socket) => {
  // Start a new game
  socket.on("tictactoe:start-game", async ({ gameId }) => {
    try {
      console.log(`[TICTACTOE] Starting game ${gameId}`);

      const game = await Game.findById(gameId)
        .populate("players.user", "name email")
        .populate("creator", "name email");

      if (!game) {
        socket.emit("game-error", { message: "Game not found" });
        return;
      }

      // Ensure we have exactly 2 players
      if (game.players.length !== 2) {
        socket.emit("game-error", {
          message: "Need exactly 2 players to start",
        });
        return;
      }

      // Initialize game with our utility function
      initializeTicTacToeGame(game);

      await game.save();

      // Log the initialized state
      console.log("[TICTACTOE] Game initialized:", {
        gameId,
        currentPlayer: game.gameState.currentPlayer,
        phase: game.gameState.phase,
        board: game.gameState.board,
      });

      // Emit events
      io.to(gameId).emit("game-updated", {
        gameId,
        game: game.toObject(),
      });

      // Also emit a specific game-state event
      io.to(gameId).emit("game-state", {
        gameId,
        gameState: game.gameState,
      });

      io.to(gameId).emit("tictactoe:start-game-success", {
        gameId,
        message: "Game started successfully",
      });
    } catch (error) {
      console.error("[ERROR] Error starting game:", error);
      socket.emit("game-error", { message: "Server error starting game" });
    }
  });

  // Make a move
  socket.on("tictactoe:make-move", async ({ gameId, index, symbol }) => {
    try {
      console.log(`[TICTACTOE] Player ${socket.userId} making move:`, {
        gameId,
        index,
        symbol,
      });

      // Get the game from the database
      const game = await Game.findById(gameId)
        .populate("players.user", "name email")
        .populate("creator", "name email");

      if (!game) {
        socket.emit("tictactoe:move-result", {
          success: false,
          message: "Game not found",
        });
        return;
      }

      // Validate the move
      if (!game.gameState || !game.gameState.board) {
        socket.emit("tictactoe:move-result", {
          success: false,
          message: "Invalid game state",
        });
        return;
      }

      // CRITICAL FIX: Check if it's the player's turn
      const playerIndex = game.players.findIndex(
        (p) => p.user._id.toString() === socket.userId.toString() // Important: ensure string comparison
      );

      if (playerIndex === -1) {
        socket.emit("tictactoe:move-result", {
          success: false,
          message: "You are not a player in this game",
        });
        return;
      }

      // CRITICAL FIX: Strictly validate turn
      if (game.gameState.currentPlayerIndex !== playerIndex) {
        console.log(
          `[TICTACTOE] Turn violation - Player ${socket.userId} tried to play but it's not their turn. Current turn: ${game.gameState.currentPlayerIndex}, Player index: ${playerIndex}`
        );
        socket.emit("tictactoe:move-result", {
          success: false,
          message: "It is not your turn",
        });
        return;
      }

      // CRITICAL FIX: Check if the cell is already taken
      if (
        game.gameState.board[index] !== "" &&
        game.gameState.board[index] !== null
      ) {
        socket.emit("tictactoe:move-result", {
          success: false,
          message: "This cell is already taken",
        });
        return;
      }

      // Make the move
      const playerSymbol = playerIndex === 0 ? "X" : "O";
      game.gameState.board[index] = playerSymbol;

      // Add to move history
      if (!game.gameState.moveHistory) {
        game.gameState.moveHistory = [];
      }

      game.gameState.moveHistory.push({
        player: socket.userId,
        position: index,
        symbol: playerSymbol,
        timestamp: new Date(),
      });

      // Check for win
      const hasWon = checkWin(game.gameState.board, playerSymbol);
      const isDraw = !hasWon && checkDraw(game.gameState.board);

      if (hasWon) {
        game.gameState.winner = socket.userId;
        game.gameState.phase = "completed";

        // Update scores - IMPORTANT FOR SCOREBOARD
        if (!game.gameState.scores) {
          game.gameState.scores = {};
        }

        // Make sure we're using string keys for the scores object
        const playerIdStr = socket.userId.toString();

        // Ensure the score exists or initialize to 0 before incrementing
        if (!game.gameState.scores[playerIdStr]) {
          game.gameState.scores[playerIdStr] = 0;
        }

        // Increment the score
        game.gameState.scores[playerIdStr] += 1;

        console.log(
          `[TICTACTOE] Player ${socket.userId} won the game. Updated scores:`,
          game.gameState.scores
        );

        // Make sure this gets saved to the database
        await game.save();

        // Emit a specific score-updated event to ensure clients update their UI
        io.to(gameId).emit("tictactoe:score-updated", {
          gameId,
          scores: game.gameState.scores,
          winner: socket.userId,
        });
      } else if (isDraw) {
        game.gameState.isDraw = true;
        game.gameState.phase = "completed";
        console.log(`[TICTACTOE] Game ended in a draw`);
      } else {
        // CRITICAL FIX: Switch turns
        game.gameState.currentPlayerIndex =
          (game.gameState.currentPlayerIndex + 1) % 2;
        game.gameState.currentPlayer =
          game.players[game.gameState.currentPlayerIndex].user._id;

        console.log(
          `[TICTACTOE] Switched turn to player ${game.gameState.currentPlayerIndex} (${game.gameState.currentPlayer})`
        );
      }

      // CRITICAL FIX: Save the updated game BEFORE emitting the event
      await game.save();
      console.log(
        `[TICTACTOE] Broadcasting updated game state to all players in room ${gameId}`
      );
      console.log(`[TICTACTOE] Current board:`, game.gameState.board);

      // CRITICAL FIX: Make sure updates are broadcast to ALL clients
      io.to(gameId).emit("game-state", {
        gameId,
        gameState: game.gameState,
      });

      // Send success response to the player who made the move
      socket.emit("tictactoe:move-result", {
        success: true,
        move: {
          index,
          symbol: playerSymbol,
        },
      });

      // If game is completed, emit game-completed event
      if (game.gameState.phase === "completed") {
        io.to(gameId).emit("game-completed", {
          gameId,
          winner: game.gameState.winner,
          isDraw: game.gameState.isDraw,
          scores: game.gameState.scores,
        });
      }
    } catch (error) {
      console.error("[TICTACTOE] Error making move:", error);
      socket.emit("tictactoe:move-result", {
        success: false,
        message: "Server error making move",
      });
    }
  });

  // Start next round
  socket.on(
    "tictactoe:next-round",
    async ({ gameId, preserveScores, scores }) => {
      try {
        console.log(`[TICTACTOE] Starting next round for game: ${gameId}`);

        const game = await Game.findById(gameId)
          .populate("players.user", "name email")
          .populate("creator", "name email");

        if (!game) {
          socket.emit("game-error", { message: "Game not found" });
          return;
        }

        // Save the current scores if they exist
        const currentScores = preserveScores
          ? scores || game.gameState?.scores || {}
          : {};

        console.log(
          "[TICTACTOE] Preserving scores for next round:",
          currentScores
        );

        // Re-initialize the game but keep the scores
        await initializeTicTacToeGame(game);

        // CRITICAL: Restore scores after initialization
        if (game.gameState && preserveScores) {
          game.gameState.scores = currentScores;
          await game.save();
          console.log(
            "[TICTACTOE] Scores restored for next round:",
            game.gameState.scores
          );
        }

        // Emit update to all players
        await emitGameUpdate(gameId, game.gameState);

        socket.emit("tictactoe:next-round-result", {
          success: true,
          gameState: game.gameState,
        });
      } catch (error) {
        console.error("[TICTACTOE] Error starting next round:", error);
        socket.emit("tictactoe:next-round-result", {
          success: false,
          message: "Server error starting next round",
        });
      }
    }
  );

  // Add a handler to fix the game state
  socket.on("tictactoe:fix-game-state", async ({ gameId }) => {
    try {
      console.log(`[TICTACTOE] Fixing game state for game: ${gameId}`);

      const game = await Game.findById(gameId)
        .populate("players.user", "name email")
        .populate("creator", "name email");

      if (!game) {
        socket.emit("game-error", { message: "Game not found" });
        return;
      }

      // Check if user is authorized (creator or admin)
      if (game.creator._id.toString() !== socket.userId) {
        socket.emit("game-error", {
          message: "Not authorized to fix this game",
        });
        return;
      }

      // Fix by reinitializing
      if (game.players.length === 2) {
        const gameState = await initializeTicTacToeGame(game);

        if (gameState) {
          socket.emit("tictactoe:fix-result", { success: true });
        } else {
          socket.emit("tictactoe:fix-result", {
            success: false,
            message: "Failed to initialize game state",
          });
        }
      } else {
        socket.emit("tictactoe:fix-result", {
          success: false,
          message: "Need exactly 2 players to initialize game",
        });
      }
    } catch (error) {
      console.error("[TICTACTOE] Error fixing game state:", error);
      socket.emit("tictactoe:fix-result", {
        success: false,
        message: "Server error fixing game state",
      });
    }
  });

  // Apply emergency fix (resets game completely)
  socket.on("tictactoe:emergency-fix", async ({ gameId }) => {
    try {
      console.log(`[TICTACTOE] Emergency fix for game: ${gameId}`);

      const game = await Game.findById(gameId);

      if (!game) {
        socket.emit("game-error", { message: "Game not found" });
        return;
      }

      // Check if user is authorized (creator or admin)
      if (game.creator.toString() !== socket.userId) {
        socket.emit("game-error", {
          message: "Not authorized to fix this game",
        });
        return;
      }

      // Reset game state completely
      game.gameState = undefined;
      await game.save();

      // Re-initialize if both players are present
      if (game.players.length === 2) {
        const updatedGame = await Game.findById(gameId)
          .populate("players.user", "name email")
          .populate("creator", "name email");

        await initializeTicTacToeGame(updatedGame);
      }

      // Notify all clients that an emergency fix was applied
      io.to(gameId).emit("game-emergency-fixed", {
        gameId,
        message: "Game has been reset by the host",
      });

      socket.emit("tictactoe:emergency-fix-result", { success: true });
    } catch (error) {
      console.error("[TICTACTOE] Error applying emergency fix:", error);
      socket.emit("tictactoe:emergency-fix-result", {
        success: false,
        message: "Server error applying emergency fix",
      });
    }
  });

  // Add a synchronized game state fix function
  socket.on("tictactoe:sync-game-state", async ({ gameId }) => {
    try {
      console.log(
        `[TICTACTOE] Sync request from ${socket.userId} for game: ${gameId}`
      );

      const game = await Game.findById(gameId)
        .populate("players.user", "name email")
        .populate("creator", "name email");

      if (!game) {
        socket.emit("game-error", { message: "Game not found" });
        return;
      }

      // Check if game needs initialization
      if (!game.gameState || !game.gameState.phase) {
        if (game.players.length === 2) {
          console.log(`[TICTACTOE] Game needs initialization, initializing...`);
          await initializeTicTacToeGame(game);
        } else {
          socket.emit("tictactoe:sync-result", {
            success: false,
            message: "Game not fully initialized yet",
          });
          return;
        }
      }

      // Log player details for debugging
      console.log("[TICTACTOE] Player IDs for sync:", {
        player1: {
          id: game.players[0].user._id.toString(),
          name: game.players[0].user.name,
        },
        player2: {
          id: game.players[1].user._id.toString(),
          name: game.players[1].user.name,
        },
      });

      console.log("[TICTACTOE] Synchronized game state:", {
        phase: game.gameState.phase,
        currentPlayerIndex: game.gameState.currentPlayerIndex,
        board: game.gameState.board,
      });

      // Emit the current game state to the requesting client
      socket.emit("tictactoe:sync-result", {
        success: true,
        gameState: game.gameState,
      });

      // Also emit to all clients in the room to ensure everyone is in sync
      emitGameUpdate(gameId, game.gameState);
    } catch (error) {
      console.error("[TICTACTOE] Error syncing game state:", error);
      socket.emit("tictactoe:sync-result", {
        success: false,
        message: "Server error syncing game state",
      });
    }
  });

  // Replace or update the existing join-game handler in your socket.js file
  socket.on("join-game", async ({ gameId }) => {
    try {
      console.log(
        `[SOCKET] User ${socket.userId} joining game room: ${gameId}`
      );

      // Join the socket room for this game
      socket.join(gameId);
      console.log(`[SOCKET] User ${socket.userId} joined game room: ${gameId}`);

      // Get the game from the database
      const game = await Game.findById(gameId)
        .populate("players.user", "name email")
        .populate("creator", "name email");

      if (!game) {
        socket.emit("game-error", { message: "Game not found" });
        return;
      }

      // Check if this is a Tic Tac Toe game that needs initialization
      if (game.gameType === "tic-tac-toe" && game.players.length >= 2) {
        // Check if the game state is incomplete or missing
        if (!game.gameState || !game.gameState.phase) {
          console.log(`[TICTACTOE] Initializing game state for game ${gameId}`);

          // Get player IDs
          const player1Id = game.players[0].user._id.toString();
          const player2Id = game.players[1].user._id.toString();

          console.log("[TICTACTOE] Initializing with players:", {
            player1: { id: player1Id, name: game.players[0].user.name },
            player2: { id: player2Id, name: game.players[1].user.name },
          });

          // *** CRITICAL FIX: Check for existing scores in previous games ***
          // Query for any previous games between these two players to get their scores
          const previousGames = await Game.find({
            gameType: "tic-tac-toe",
            "players.user": { $all: [player1Id, player2Id] },
            _id: { $ne: gameId }, // Exclude current game
          })
            .sort({ createdAt: -1 })
            .limit(5);

          // Extract scores from previous games
          let previousScores = {
            [player1Id]: 0,
            [player2Id]: 0,
          };

          if (previousGames.length > 0) {
            console.log(
              `[TICTACTOE] Found ${previousGames.length} previous games between these players`
            );

            // Check the most recent game with scores
            for (const prevGame of previousGames) {
              if (prevGame.gameState && prevGame.gameState.scores) {
                const p1Score = prevGame.gameState.scores[player1Id] || 0;
                const p2Score = prevGame.gameState.scores[player2Id] || 0;

                previousScores = {
                  [player1Id]: p1Score,
                  [player2Id]: p2Score,
                };

                console.log(
                  "[TICTACTOE] Using scores from previous game:",
                  previousScores
                );
                break; // Use the first game with scores
              }
            }
          }

          // Initialize the game state with all required fields
          game.status = "in-progress";
          game.gameState = {
            board: ["", "", "", "", "", "", "", "", ""],
            currentPlayer: player1Id,
            currentPlayerIndex: 0,
            wordSelector: player1Id, // First player is word selector
            guesser: player2Id, // Second player is guesser
            round: 1,
            totalRounds: 5,
            phase: "playing", // Explicitly set phase
            winner: null,
            winningLine: null,
            isDraw: false,
            moveHistory: [],
            // CRITICAL FIX: Use previous scores or initialize to 0
            scores: previousScores,
            players: [
              { id: player1Id, symbol: "X", index: 0 },
              { id: player2Id, symbol: "O", index: 1 },
            ],
            currentTurn: player1Id, // First player's turn
          };

          // Save the updated game
          await game.save();

          console.log("[TICTACTOE] Game initialized with state:", {
            phase: game.gameState.phase,
            scores: game.gameState.scores,
            currentPlayer: game.gameState.currentPlayer,
          });

          // Emit the updated game to all clients in the room
          io.to(gameId).emit("game-updated", {
            gameId,
            game: game.toObject(),
          });

          // Also emit a specific game-state event
          io.to(gameId).emit("game-state", {
            gameId,
            gameState: game.gameState,
          });

          // Send a system message to the chat
          io.to(gameId).emit("chat-message", {
            id: Date.now(),
            type: "system",
            message: "Game has been initialized and is ready to play.",
            timestamp: new Date(),
          });
        }
      }

      // Notify other players that someone joined
      socket.to(gameId).emit("player-joined", {
        gameId,
        playerId: socket.userId,
        playerName: socket.userName || "A player",
      });
    } catch (error) {
      console.error("[ERROR] Error joining game:", error);
      socket.emit("game-error", { message: "Server error joining game" });
    }
  });

  // Add a new handler for clearly identifying completed games to your socket handlers
  socket.on("tictactoe:check-game-status", async ({ gameId }) => {
    try {
      console.log(`[TICTACTOE] Checking game status for: ${gameId}`);

      const game = await Game.findById(gameId)
        .populate("players.user", "name email")
        .populate("creator", "name email");

      if (!game) {
        socket.emit("game-error", { message: "Game not found" });
        return;
      }

      // Check if the game is completed
      if (game.gameState && game.gameState.phase === "completed") {
        // Emit the completion event with winner information
        socket.emit("tictactoe:game-status", {
          gameId,
          phase: "completed",
          winner: game.gameState.winner,
          isDraw: game.gameState.isDraw,
          scores: game.gameState.scores,
        });
      } else {
        socket.emit("tictactoe:game-status", {
          gameId,
          phase: game.gameState?.phase || "unknown",
        });
      }
    } catch (error) {
      console.error("[TICTACTOE] Error checking game status:", error);
      socket.emit("game-error", { message: "Error checking game status" });
    }
  });

  // Add this new handler after the other socket handlers (around line 600)
  socket.on("tictactoe:save-scores", async ({ gameId, scores }) => {
    try {
      console.log(`[TICTACTOE] Saving scores for game ${gameId}:`, scores);

      if (!scores || Object.keys(scores).length === 0) {
        console.log("[TICTACTOE] No scores provided, skipping save");
        socket.emit("tictactoe:save-scores-result", {
          success: false,
          message: "No scores provided",
        });
        return;
      }

      const game = await Game.findById(gameId);

      if (!game) {
        socket.emit("game-error", { message: "Game not found" });
        return;
      }

      // Initialize gameState if it doesn't exist
      if (!game.gameState) {
        game.gameState = {};
      }

      // Save the scores
      game.gameState.scores = scores;
      await game.save();

      console.log(`[TICTACTOE] Scores saved successfully for game ${gameId}`);

      socket.emit("tictactoe:save-scores-result", {
        success: true,
        message: "Scores saved successfully",
      });
    } catch (error) {
      console.error("[TICTACTOE] Error saving scores:", error);
      socket.emit("tictactoe:save-scores-result", {
        success: false,
        message: "Server error saving scores",
      });
    }
  });
};

module.exports = (io, socket) => {
  setupTicTacToeHandlers(io, socket);
};
