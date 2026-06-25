const mongoose = require("mongoose");

const agentLogSchema = new mongoose.Schema({
  agentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  agentName: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ["agent", "admin"],
    required: true
  },

  action: {
    type: String,
    required: true
  },

  targetType: {
    type: String,
    enum: [
      "deposit",
      "withdrawal",
      "user",
      "system"
    ],
    required: true
  },

  targetId: {
    type: String,
    default: ""
  },

  amount: {
    type: Number,
    default: 0
  },

  note: {
    type: String,
    default: ""
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

agentLogSchema.index({
  agentId: 1,
  createdAt: -1
});

agentLogSchema.index({
  targetType: 1,
  createdAt: -1
});

module.exports =
  mongoose.model(
    "AgentLog",
    agentLogSchema
  );