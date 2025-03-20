const Joi = require('joi');

/**
 * Validate user registration input
 */
const validateRegistration = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).required()
      .messages({
        'string.empty': 'Name is required',
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 50 characters'
      }),
    email: Joi.string().email().required()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address'
      }),
    password: Joi.string().min(6).required()
      .messages({
        'string.empty': 'Password is required',
        'string.min': 'Password must be at least 6 characters long'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({ 
      success: false, 
      message: 'Validation error', 
      errors 
    });
  }
  
  next();
};

/**
 * Validate user login input
 */
const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required()
      .messages({
        'string.empty': 'Email is required',
        'string.email': 'Please provide a valid email address'
      }),
    password: Joi.string().required()
      .messages({
        'string.empty': 'Password is required'
      })
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({ 
      success: false, 
      message: 'Validation error', 
      errors 
    });
  }
  
  next();
};

/**
 * Validate game creation input
 */
const validateGameCreation = (req, res, next) => {
  const schema = Joi.object({
    gameType: Joi.string().valid('guess-the-word', 'tic-tac-toe', 'hangman', 'memory-match').required()
      .messages({
        'string.empty': 'Game type is required',
        'any.only': 'Invalid game type'
      }),
    title: Joi.string().min(3).max(100).required()
      .messages({
        'string.empty': 'Game title is required',
        'string.min': 'Game title must be at least 3 characters long',
        'string.max': 'Game title cannot exceed 100 characters'
      }),
    maxPlayers: Joi.number().min(2).max(10).default(4)
      .messages({
        'number.min': 'Game must allow at least 2 players',
        'number.max': 'Game cannot have more than 10 players'
      }),
    settings: Joi.object().default({})
  });

  const { error } = schema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errors = error.details.map(detail => detail.message);
    return res.status(400).json({ 
      success: false, 
      message: 'Validation error', 
      errors 
    });
  }
  
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateGameCreation
}; 