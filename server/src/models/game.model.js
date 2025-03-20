const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const { v4: uuidv4 } = require('uuid');

const gameSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  creator: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  gameType: {
    type: String,
    required: true,
    enum: ['word-guess', 'trivia', 'tic-tac-toe']
  },
  players: [{
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['host', 'player'],
      default: 'player'
    },
    score: {
      type: Number,
      default: 0
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  maxPlayers: {
    type: Number,
    default: 4
  },
  status: {
    type: String,
    enum: ['waiting', 'in-progress', 'completed', 'cancelled'],
    default: 'waiting'
  },
  inviteCode: {
    type: String,
    required: true,
    unique: true
  },
  currentTurn: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  gameState: {
    type: Schema.Types.Mixed,
    default: {}
  },
  settings: {
    type: Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes for faster queries
gameSchema.index({ creator: 1 });
gameSchema.index({ 'players.user': 1 });
gameSchema.index({ status: 1 });

module.exports = mongoose.model('Game', gameSchema); 