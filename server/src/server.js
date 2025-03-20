const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const { initializeSocket } = require("./socket");
require("dotenv").config();

// Import routes
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const gameRoutes = require("./routes/game.routes");

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Make io available to our routes
app.set("io", io);

// Middleware
app.use(cors());
app.use(express.json());

// Add this middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes - specific routes first
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/games", gameRoutes);

// Then any catch-all or default routes
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected:", mongoose.connection.host);

    // Start server
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Don't require these here to avoid circular dependencies
// const socketHandlers = require('./socket/handlers');
