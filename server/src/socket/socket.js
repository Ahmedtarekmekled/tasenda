const socketIo = require("socket.io");
const { verifyToken } = require("../middleware/auth");
const User = require("../models/user.model");
const Game = require("../models/game.model");
const {
  initializeGameState,
  processGameAction,
} = require("../services/game.service");
const questionGuessController = require("../controllers/questionGuess.controller");
const { setupTicTacToeHandlers } = require("./tictactoeHandlers");
const jwt = require("jsonwebtoken");
const path = require("path");
const ChatMessage = require(path.join(__basedir, "src/models/chat.model.js"));

// Store active game rooms and their players
const gameRooms = new Map();

const initializeSocket = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io",
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error: Token missing"));
      }

      const decoded = verifyToken(token);

      if (!decoded) {
        return next(new Error("Authentication error: Invalid token"));
      }

      // Find user by id
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      // Attach user to socket
      socket.user = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      };

      console.log(`[SOCKET] Authenticated user ${user.name} (${user._id})`);
      next();
    } catch (error) {
      console.error("[SOCKET] Authentication error:", error.message);
      next(new Error("Authentication failed"));
    }
  });

  // Debug middleware to log all events
  io.use((socket, next) => {
    const originalEmit = socket.emit;
    socket.emit = function (event, ...args) {
      console.log(`[DEBUG] Server emitting to client ${socket.id}: ${event}`);
      return originalEmit.apply(this, [event, ...args]);
    };
    next();
  });

  io.on("connection", (socket) => {
    console.log(
      `[SOCKET] Client connected: ${socket.id}, User: ${
        socket.user?.name || "Unknown"
      }`
    );

    // Join a game room
    socket.on("join-game", async ({ gameId }) => {
      if (!gameId) {
        console.log(`[JOIN] Missing gameId from ${socket.user.name}`);
        return;
      }

      console.log(
        `[JOIN] User ${socket.user.name} (${socket.user.id}) joining game: ${gameId}`
      );

      try {
        // Join the socket room
        socket.join(gameId);

        // Add player to game room tracking
        if (!gameRooms.has(gameId)) {
          gameRooms.set(gameId, new Set());
        }

        const room = gameRooms.get(gameId);
        room.add(socket.user.id);

        console.log(`[JOIN] Room ${gameId} now has ${room.size} players`);

        // Get the latest game state
        const game = await Game.findById(gameId)
          .populate("players.user", "name email")
          .populate("creator", "name email");

        if (!game) {
          console.error(`[ERROR] Game not found: ${gameId}`);
          socket.emit("game-error", { message: "Game not found" });
          return;
        }

        console.log(
          `[JOIN] Game ${gameId} status: ${game.status}, players: ${game.players.length}`
        );

        // Notify other players that someone joined
        socket.to(gameId).emit("player-joined", {
          gameId,
          playerId: socket.user.id,
          playerName: socket.user.name,
        });

        // Send the current game state to the joining player
        socket.emit("game-updated", {
          gameId,
          game,
        });

        // Also broadcast to all players to ensure everyone has the latest state
        io.to(gameId).emit("game-updated", {
          gameId,
          game,
        });

        // If game is already in progress, make sure the player gets the latest state
        if (game.status === "in-progress" && game.gameState) {
          console.log(
            `[JOIN] Game is in progress, sending current state to joining player`
          );
          socket.emit("game-started", {
            gameId,
            game,
          });
        }

        // Check if we have enough players to start (but don't auto-start)
        if (game.players.length >= 2 && game.status === "waiting") {
          console.log(
            `[JOIN] Game has ${game.players.length} players and is ready to start`
          );

          // Notify the host that the game can be started
          const hostSocket = Array.from(io.sockets.sockets.values()).find(
            (s) => s.user && s.user.id === game.creator._id.toString()
          );

          if (hostSocket) {
            hostSocket.emit("game-ready", {
              gameId,
              message: "Game has enough players and is ready to start",
            });
          }
        }
      } catch (error) {
        console.error("[ERROR] Error joining game:", error);
        socket.emit("game-error", { message: "Server error joining game" });
      }
    });

    // Leave a game room
    socket.on("leave-game", ({ gameId }) => {
      if (!gameId) return;

      console.log(`[LEAVE] User ${socket.user.name} leaving game: ${gameId}`);

      // Leave the socket room
      socket.leave(gameId);

      // Remove player from game room tracking
      if (gameRooms.has(gameId)) {
        const room = gameRooms.get(gameId);
        room.delete(socket.user.id);

        // Notify other players that someone left
        socket.to(gameId).emit("player-left", {
          gameId,
          playerId: socket.user.id,
          playerName: socket.user.name,
        });

        console.log(`[LEAVE] ${socket.user.name} left game room: ${gameId}`);
        console.log(`[PLAYERS] Players in room ${gameId}:`, Array.from(room));
      }
    });

    // Handle chat messages
    socket.on("chat-message", async ({ gameId, message }) => {
      try {
        if (!gameId || !message) {
          console.log(
            `[CHAT] Missing gameId or message from ${socket.user.name}`
          );
          return;
        }

        console.log(
          `[CHAT] Message from ${socket.user.name} in game ${gameId}: ${message}`
        );

        // Create a message object with all necessary properties
        const chatMessage = {
          id: Date.now(),
          userId: socket.user.id,
          userName: socket.user.name,
          message: message,
          timestamp: new Date(),
          type: "user", // to distinguish from system messages
        };

        // Broadcast to ALL players in the room (including sender)
        io.to(gameId).emit("chat-message", chatMessage);

        // Log that the message was sent
        console.log(
          `[CHAT] Message broadcast to all players in room ${gameId}`
        );
      } catch (error) {
        console.error("[ERROR] Error sending chat message:", error);
      }
    });

    // Start a game
    socket.on("start-game", async ({ gameId }) => {
      try {
        console.log(
          `[START] User ${socket.user.name} (${socket.user.id}) attempting to start game: ${gameId}`
        );

        // Find the game with full population
        const game = await Game.findById(gameId)
          .populate("players.user", "name email")
          .populate("creator", "name email");

        if (!game) {
          console.error(`[ERROR] Game not found: ${gameId}`);
          socket.emit("game-error", { message: "Game not found" });
          return;
        }

        // Check if user is the host
        if (game.creator._id.toString() !== socket.user.id) {
          console.error(
            `[ERROR] User ${socket.user.id} is not the host of game ${gameId}`
          );
          socket.emit("game-error", {
            message: "Only the host can start the game",
          });
          return;
        }

        // Check if there are enough players
        if (game.players.length < 2) {
          console.error(`[ERROR] Not enough players to start game ${gameId}`);
          socket.emit("game-error", {
            message: "Need at least 2 players to start the game",
          });
          return;
        }

        console.log(
          `[START] Starting game ${gameId} with ${game.players.length} players`
        );

        // Update game status
        game.status = "in-progress";

        // For question-guess game type
        if (game.gameType === "question-guess") {
          // Make the creator the first word selector
          const creatorId = game.creator._id.toString();

          // Find a player who is not the creator to be the guesser
          const otherPlayers = game.players
            .filter((p) => p.user._id.toString() !== creatorId)
            .map((p) => p.user._id.toString());

          // If no other players, use the first player in the list
          const guesser =
            otherPlayers.length > 0
              ? otherPlayers[0]
              : game.players[0].user._id.toString();

          console.log(
            `[START] Creator ID: ${creatorId}, Guesser ID: ${guesser}`
          );

          // Initialize game state
          game.gameState = {
            round: 1,
            totalRounds: game.settings?.rounds || 5,
            phase: "word-selection",
            secretWord: "",
            hints: [],
            questions: [],
            guesses: [],
            scores: {},
            wordSelector: creatorId, // Creator is the word selector
            guesser: guesser,
            currentTurn: creatorId, // Creator's turn to select a word
          };

          console.log(
            `[START] Game state initialized:`,
            JSON.stringify(game.gameState, null, 2)
          );
        }

        // Save the updated game
        await game.save();
        console.log(`[START] Game saved with new state`);

        // Emit game-started event to all players
        io.to(gameId).emit("game-started", {
          gameId,
          game: game.toObject(),
        });

        console.log(`[START] Emitted game-started event`);

        // Also emit game-updated for consistency
        io.to(gameId).emit("game-updated", {
          gameId,
          game: game.toObject(),
        });

        console.log(`[START] Emitted game-updated event`);

        // Send a system message to the chat
        io.to(gameId).emit("chat-message", {
          id: Date.now(),
          type: "system",
          message: `Game has started! It's ${game.creator.name}'s turn to select a word.`,
          timestamp: new Date(),
        });

        console.log(`[START] Game started successfully: ${gameId}`);

        // Send confirmation back to the host
        socket.emit("start-game-success", {
          message: "Game started successfully",
        });
      } catch (error) {
        console.error("[ERROR] Error starting game:", error);
        socket.emit("game-error", { message: "Server error starting game" });
      }
    });

    // Question-Guess Game: Submit Word
    socket.on("question-guess:submit-word", async ({ gameId, word, hints }) => {
      try {
        console.log(
          `[WORD] User ${socket.user.name} submitting word for game: ${gameId}`
        );

        if (
          !gameId ||
          !word ||
          !hints ||
          !Array.isArray(hints) ||
          hints.length !== 2
        ) {
          console.error(`[ERROR] Invalid word submission data`);
          socket.emit("question-guess:word-submitted", {
            success: false,
            message: "Invalid word or hints",
          });
          return;
        }

        const game = await Game.findById(gameId);

        if (!game) {
          console.error(`[ERROR] Game not found: ${gameId}`);
          socket.emit("question-guess:word-submitted", {
            success: false,
            message: "Game not found",
          });
          return;
        }

        // Check if the user is the word selector
        if (game.gameState.wordSelector !== socket.user.id) {
          console.error(
            `[ERROR] User ${socket.user.name} is not the word selector`
          );
          socket.emit("question-guess:word-submitted", {
            success: false,
            message: "You are not the word selector",
          });
          return;
        }

        // Check if the game is in the word selection phase
        if (game.gameState.phase !== "word-selection") {
          socket.emit("question-guess:word-submitted", {
            success: false,
            message: "Game is not in word selection phase",
          });
          return;
        }

        // Update game state
        game.gameState.secretWord = word;
        game.gameState.hints = hints;
        game.gameState.phase = "questioning";
        game.gameState.currentTurn = game.gameState.guesser; // Switch turn to guesser

        await game.save();

        console.log(
          `[WORD] Word submitted successfully. Moving to questioning phase.`
        );

        // Notify the word selector
        socket.emit("question-guess:word-submitted", {
          success: true,
          message: "Word submitted successfully",
        });

        // Update all players with the new game state
        io.to(gameId).emit("game-updated", {
          gameId,
          game,
        });

        // Send a system message to the chat
        io.to(gameId).emit("chat-message", {
          id: Date.now(),
          type: "system",
          message: `Word has been selected! It's ${
            game.players.find(
              (p) => p.user._id.toString() === game.gameState.guesser
            )?.user.name
          }'s turn to ask questions.`,
          timestamp: new Date(),
        });
      } catch (error) {
        console.error("[ERROR] Error submitting word:", error);
        socket.emit("question-guess:word-submitted", {
          success: false,
          message: "Server error",
        });
      }
    });

    // Question-Guess Game: Submit Question
    socket.on(
      "question-guess:submit-question",
      async ({ gameId, question }) => {
        try {
          console.log(
            `[GAME] User ${socket.user.name} submitting question in game ${gameId}: ${question}`
          );

          const result = await questionGuessController.submitQuestion(
            gameId,
            socket.user.id,
            question
          );

          if (result.success) {
            // Notify all players that the question was submitted
            io.to(gameId).emit("question-guess:question-submitted", {
              success: true,
              question:
                result.game.gameState.questions[
                  result.game.gameState.questions.length - 1
                ],
              questionIndex: result.game.gameState.questions.length - 1,
            });

            // Update game state for all players
            io.to(gameId).emit("game-updated", {
              gameId,
              game: result.game,
            });

            // Send a system message to the chat
            io.to(gameId).emit("chat-message", {
              id: Date.now(),
              type: "system",
              message: `${socket.user.name} asked: "${question}"`,
              timestamp: new Date(),
            });
          } else {
            socket.emit("question-guess:question-submitted", {
              success: false,
              message: result.message,
            });
          }
        } catch (error) {
          console.error("[ERROR] Error submitting question:", error);
          socket.emit("question-guess:question-submitted", {
            success: false,
            message: "Server error",
          });
        }
      }
    );

    // Question-Guess Game: Answer Question
    socket.on(
      "question-guess:answer-question",
      async ({ gameId, questionIndex, answer }) => {
        try {
          console.log(
            `[GAME] User ${socket.user.name} answering question ${questionIndex} in game ${gameId}: ${answer}`
          );

          const result = await questionGuessController.answerQuestion(
            gameId,
            socket.user.id,
            questionIndex,
            answer
          );

          if (result.success) {
            // Notify all players that the question was answered
            io.to(gameId).emit("question-guess:question-answered", {
              success: true,
              questionIndex,
              answer,
            });

            // Update game state for all players
            io.to(gameId).emit("game-updated", {
              gameId,
              game: result.game,
            });

            // Send a system message to the chat
            io.to(gameId).emit("chat-message", {
              id: Date.now(),
              type: "system",
              message: `${socket.user.name} answered: "${answer}"`,
              timestamp: new Date(),
            });
          } else {
            socket.emit("question-guess:question-answered", {
              success: false,
              message: result.message,
            });
          }
        } catch (error) {
          console.error("[ERROR] Error answering question:", error);
          socket.emit("question-guess:question-answered", {
            success: false,
            message: "Server error",
          });
        }
      }
    );

    // Question-Guess Game: Submit Guess
    socket.on("question-guess:submit-guess", async ({ gameId, guess }) => {
      try {
        console.log(
          `[GAME] User ${socket.user.name} submitting guess in game ${gameId}: ${guess}`
        );

        const result = await questionGuessController.submitGuess(
          gameId,
          socket.user.id,
          guess
        );

        if (result.success) {
          // Determine if the guess was correct
          const isCorrect = result.isCorrect;

          // Notify all players about the guess
          io.to(gameId).emit("question-guess:guess-submitted", {
            success: true,
            guess:
              result.game.gameState.guesses[
                result.game.gameState.guesses.length - 1
              ],
            isCorrect,
            secretWord:
              isCorrect || result.game.gameState.guesses.length === 3
                ? result.game.gameState.secretWord
                : null,
          });

          // Update game state for all players
          io.to(gameId).emit("game-updated", {
            gameId,
            game: result.game,
          });

          // Send a system message to the chat
          let message;
          if (isCorrect) {
            message = `${socket.user.name} correctly guessed the word: "${guess}"!`;
          } else if (result.game.gameState.guesses.length === 3) {
            message = `${socket.user.name} guessed "${guess}" but it was wrong. The word was "${result.game.gameState.secretWord}".`;
          } else {
            message = `${
              socket.user.name
            } guessed "${guess}" but it was wrong. ${
              3 - result.game.gameState.guesses.length
            } guesses remaining.`;
          }

          io.to(gameId).emit("chat-message", {
            id: Date.now(),
            type: "system",
            message,
            timestamp: new Date(),
          });

          // If the round is over, send another message
          if (isCorrect || result.game.gameState.guesses.length === 3) {
            // Check if game is over
            if (result.game.gameState.phase === "results") {
              // Calculate winner
              const scores = result.game.gameState.scores;
              const highestScore = Math.max(...Object.values(scores));
              const winners = Object.entries(scores)
                .filter(([_, score]) => score === highestScore)
                .map(([playerId, _]) => {
                  const player = result.game.players.find(
                    (p) => p.user._id.toString() === playerId
                  );
                  return player ? player.user.name : "Unknown";
                });

              const winnerMessage =
                winners.length > 1
                  ? `Game over! It's a tie between ${winners.join(" and ")}!`
                  : `Game over! ${winners[0]} wins!`;

              io.to(gameId).emit("chat-message", {
                id: Date.now() + 1,
                type: "system",
                message: winnerMessage,
                timestamp: new Date(),
              });

              io.to(gameId).emit("game-completed", {
                gameId,
                winners,
                scores,
              });
            } else {
              // Next round message
              io.to(gameId).emit("chat-message", {
                id: Date.now() + 1,
                type: "system",
                message: `Round ${
                  result.game.gameState.currentRound
                } completed! Starting round ${
                  result.game.gameState.currentRound + 1
                }...`,
                timestamp: new Date(),
              });
            }
          }
        } else {
          socket.emit("question-guess:guess-submitted", {
            success: false,
            message: result.message,
          });
        }
      } catch (error) {
        console.error("[ERROR] Error submitting guess:", error);
        socket.emit("question-guess:guess-submitted", {
          success: false,
          message: "Server error",
        });
      }
    });

    // Add this function to fix stuck games
    socket.on("fix-game", async ({ gameId }) => {
      try {
        console.log(
          `[FIX] User ${socket.user.name} (${socket.user.id}) attempting to fix game: ${gameId}`
        );

        // Find the game
        const game = await Game.findById(gameId)
          .populate("players.user", "name email")
          .populate("creator", "name email");

        if (!game) {
          console.error(`[ERROR] Game not found: ${gameId}`);
          socket.emit("game-error", { message: "Game not found" });
          return;
        }

        // Check if user is the host
        if (game.creator._id.toString() !== socket.user.id) {
          console.error(
            `[ERROR] User ${socket.user.id} is not the host of game ${gameId}`
          );
          socket.emit("game-error", {
            message: "Only the host can fix the game",
          });
          return;
        }

        console.log(`[FIX] Fixing game ${gameId}`);

        // Make the creator the first word selector
        const creatorId = game.creator._id.toString();

        // Find a player who is not the creator to be the guesser
        const otherPlayers = game.players
          .filter((p) => p.user._id.toString() !== creatorId)
          .map((p) => p.user._id.toString());

        // If no other players, use the first player in the list
        const guesser =
          otherPlayers.length > 0
            ? otherPlayers[0]
            : game.players[0].user._id.toString();

        // Force update game status and state
        game.status = "in-progress";
        game.gameState = {
          round: 1,
          totalRounds: game.settings?.rounds || 5,
          phase: "word-selection",
          secretWord: "",
          hints: [],
          questions: [],
          guesses: [],
          scores: {},
          wordSelector: creatorId,
          guesser: guesser,
          currentTurn: creatorId,
        };

        // Save the updated game
        await game.save();

        // Emit game-updated event to all players
        io.to(gameId).emit("game-updated", {
          gameId,
          game: game.toObject(),
        });

        // Send a system message to the chat
        io.to(gameId).emit("chat-message", {
          id: Date.now(),
          type: "system",
          message: `Game has been fixed by ${socket.user.name}. It's now ${game.creator.name}'s turn to select a word.`,
          timestamp: new Date(),
        });

        console.log(`[FIX] Game fixed successfully: ${gameId}`);

        socket.emit("fix-game-success", {
          message: "Game fixed successfully",
        });
      } catch (error) {
        console.error("[ERROR] Error fixing game:", error);
        socket.emit("game-error", { message: "Server error fixing game" });
      }
    });

    // Disconnect handler
    socket.on("disconnect", () => {
      console.log(
        `[DISCONNECT] User disconnected: ${socket.user.name} (${socket.id})`
      );

      // Remove player from all game rooms they were in
      for (const [gameId, players] of gameRooms.entries()) {
        if (players.has(socket.user.id)) {
          players.delete(socket.user.id);

          // Notify other players that someone left
          socket.to(gameId).emit("player-left", {
            gameId,
            playerId: socket.user.id,
            playerName: socket.user.name,
          });

          console.log(
            `[DISCONNECT] ${socket.user.name} removed from game room: ${gameId}`
          );
        }
      }
    });

    // Setup Tic Tac Toe handlers
    setupTicTacToeHandlers(io, socket);

    // Handle chat messages
    socket.on("send-chat-message", async ({ gameId, message }) => {
      try {
        console.log(`[SOCKET] Chat message received for game ${gameId}`);

        if (!socket.userId) {
          socket.emit("chat-error", { message: "Not authenticated" });
          return;
        }

        // Get the user's name - either from the socket or from the database
        const userName = socket.userName || "Unknown Player";

        // Create a message object
        const chatMessage = {
          id: Date.now(), // Use timestamp as ID
          gameId,
          senderId: socket.userId,
          senderName: userName,
          message,
          timestamp: new Date(),
        };

        console.log(`[SOCKET] Broadcasting chat message from ${userName}`);

        // Broadcast the message to all clients in the game room
        io.to(gameId).emit("chat-message", chatMessage);

        // Store message in database
        try {
          const newMessage = new ChatMessage({
            gameId,
            senderId: socket.userId,
            senderName: userName,
            message,
          });

          await newMessage.save();
          console.log(`[SOCKET] Chat message saved to database`);
        } catch (dbError) {
          console.error(
            "[SOCKET] Error saving chat message to database:",
            dbError
          );
        }
      } catch (error) {
        console.error("[SOCKET] Error sending chat message:", error);
        socket.emit("chat-error", { message: "Error sending message" });
      }
    });

    // Add handler to load chat history
    socket.on("get-chat-history", async ({ gameId, limit = 50 }) => {
      try {
        console.log(`[SOCKET] Chat history requested for game ${gameId}`);

        const messages = await ChatMessage.find({ gameId })
          .sort({ timestamp: -1 })
          .limit(limit)
          .lean();

        // Reverse the messages to show oldest first
        messages.reverse();

        socket.emit("chat-history", { gameId, messages });
        console.log(`[SOCKET] Sent ${messages.length} chat messages to client`);
      } catch (error) {
        console.error("[SOCKET] Error fetching chat history:", error);
        socket.emit("chat-error", { message: "Error loading chat history" });
      }
    });
  });

  return io;
};

// Function to emit game updates to all players in a game room
const emitGameUpdate = (io, gameId, game) => {
  if (io && gameId) {
    io.to(gameId).emit("game-updated", {
      gameId,
      game,
    });
  }
};

// Function to initialize game state when a game starts
const initializeGame = async (io, gameId) => {
  try {
    const game = await Game.findById(gameId).populate("players.user", "name");

    if (!game) {
      console.error("Game not found for initialization:", gameId);
      return;
    }

    // Initialize game state based on game type
    const gameState = initializeGameState(game);

    // Set the first player's turn
    game.currentTurn = game.players[0].user._id;
    game.gameState = gameState;

    await game.save();

    // Emit game state to all players
    io.to(gameId).emit("game-state-update", {
      gameId,
      gameState,
      currentTurn: game.currentTurn,
    });

    // Send a system message to the chat
    io.to(gameId).emit("chat-message", {
      id: Date.now(),
      type: "system",
      message: `Game has started! It's ${game.players[0].user.name}'s turn.`,
      timestamp: new Date(),
    });

    console.log(`Game initialized: ${gameId}`);
  } catch (error) {
    console.error("Error initializing game:", error);
  }
};

module.exports = {
  initializeSocket,
  emitGameUpdate,
  initializeGame,
};
