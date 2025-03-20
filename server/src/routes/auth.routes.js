const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateRegistration, validateLogin } = require('../middleware/validation.middleware');

// Register a new user
router.post('/register', validateRegistration, authController.register);

// Login user
router.post('/login', validateLogin, authController.login);

// Get current user (protected route)
router.get('/me', authenticate, authController.getCurrentUser);

// Logout is handled on the client side by removing the token

module.exports = router; 