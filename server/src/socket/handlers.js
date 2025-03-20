const path = require("path");
const Game = require(path.join(__basedir, "src/models/game.model.js"));
const {
  emitGameUpdate,
  initializeTicTacToeGame,
} = require("../utils/gameEvents");

// Register all socket event handlers
const registerHandlers = (io, socket) => {
  // Join a game room
  socket.on("join-game", async ({ gameId }) => {
    try {
      console.log(
        `[SOCKET] User ${socket.userId} joining game room: ${gameId}`
      );
      socket.join(gameId);

      // Get the game from the database
      const game = await Game.findById(gameId)
        .populate("players.user", "name email")
        .populate("creator", "name email");

      if (!game) {
        console.error(`[SOCKET] Game not found: ${gameId}`);
        socket.emit("game-error", { message: "Game not found" });
        return;
      }

      // Notify others in the room
      socket.to(gameId).emit("player-joined", {
        gameId,
        playerId: socket.userId,
        playerName: socket.user.name || "A player",
      });

      console.log(`[SOCKET] Player ${socket.userId} joined game ${gameId}`);
    } catch (error) {
      console.error("[SOCKET] Error joining game room:", error);
      socket.emit("game-error", { message: "Failed to join game room" });
    }
  });

  // Leave a game room
  socket.on("leave-game", ({ gameId }) => {
    console.log(`[SOCKET] User ${socket.userId} leaving game room: ${gameId}`);
    socket.leave(gameId);

    // Notify others that player left
    socket.to(gameId).emit("player-left", {
      gameId,
      playerName: socket.user.name,
      playerId: socket.userId,
    });
  });

  // Register game-specific handlers
  require("./tictactoeHandlers")(io, socket);
};

module.exports = registerHandlers;
