// Basic configuration file
module.exports = {
  jwtSecret: process.env.JWT_SECRET || "your-secret-key",
  clientURL: process.env.CLIENT_URL || "http://localhost:3000",
  // Other configuration values
};
