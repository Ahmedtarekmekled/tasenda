const http = require('http');
const app = require('./src/app');
const { connectDB } = require('./src/config/db');
const socketSetup = require('./src/socket');
require('dotenv').config();

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.io
socketSetup(server);

// Connect to MongoDB
connectDB();

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 