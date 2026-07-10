const mongoose = require("mongoose");

const gameSessionSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  telegramId: String,

  provider: String,

  gameCode: String,

  sessionToken: String,

  status: {
    type: String,
    default: "active"
  },

  ip: String,

  createdAt: {
    type: Date,
    default: Date.now
  },

  expiredAt: Date
});

module.exports =
mongoose.model(
  "GameSession",
  gameSessionSchema
);