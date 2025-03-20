// Load environment variables first, before any other imports
require("dotenv").config();

// Setup global paths immediately after loading environment variables
const path = require("path");
global.__basedir = path.resolve(__dirname);

// Now import dependencies that might use __basedir
const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { connectDB } = require("./src/config/db");
const authRoutes = require("./src/routes/auth.routes");
const gameRoutes = require("./src/routes/game.routes");

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Set up Socket.io - only after __basedir is defined
const { initializeSocket } = require("./src/socket");
const io = initializeSocket(server);

// Now import gameEvents and provide the io instance
const { setIo } = require("./src/utils/gameEvents");
setIo(io); // This breaks the circular dependency

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(helmet());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/games", gameRoutes);

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Root endpoint
app.get("/", (req, res) => {
  res.status(200).json({ message: "Welcome to Tasenda API" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Then in any file that needs to import models
const Game = require(path.join(__basedir, "src/models/game.model.js"));
