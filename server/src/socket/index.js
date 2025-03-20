const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Authentication error: Token required"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      socket.user = { id: decoded.id, name: decoded.name };
      next();
    } catch (error) {
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  // Store the io instance for external use
  module.exports.io = io;

  // After exporting io, import the handlers to avoid circular dependency
  const registerHandlers = require("./handlers");

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.userId}`);

    // Register all socket event handlers
    registerHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userId}`);
    });
  });

  return io;
};

module.exports = {
  initializeSocket,
  io: null, // This will be populated after initialization
};
