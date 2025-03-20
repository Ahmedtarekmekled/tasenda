const mongoose = require('mongoose');

const ticTacToeStateSchema = new mongoose.Schema({
  board: {
    type: [[String]],
    default: [
      ['', '', ''],
      ['', '', ''],
      ['', '', '']
    ]
  },
  currentPlayer: {
    type: String,
    required: true
  },
  winner: {
    type: String,
    default: null
  },
  isDraw: {
    type: Boolean,
    default: false
  },
  moveHistory: {
    type: [{
      player: String,
      position: {
        row: Number,
        col: Number
      },
      timestamp: Date
    }],
    default: []
  },
  scores: {
    type: Map,
    of: Number,
    default: new Map()
  },
  round: {
    type: Number,
    default: 1
  },
  totalRounds: {
    type: Number,
    default: 5
  }
});

module.exports = ticTacToeStateSchema; 