const mongoose = require("mongoose");

const withdrawalSchema = new mongoose.Schema({
  telegramId: {
    type: String,
    required: true,
    index: true
  },

  username: {
    type: String,
    required: true
  },

  phone: {
    type: String,
    default: ""
  },

  method: {
    type: String,
    required: true,
    enum: [
      "telebirr",
      "cbe",
      "helloCash",
      "bank"
    ]
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  withdrawalNumber: {
  type: String,
  unique: true,
  sparse: true,
  required: true
},
  accountNumber: {
    type: String,
    required: true
  },

  note: {
    type: String,
    default: ""
  },

  status: {
    type: String,
    enum: [
      "pending",
      "approved",
      "rejected"
    ],
    default: "pending",
    index: true
  },

  // Player Reference
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  // Approval
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  approvedByName: {
    type: String,
    default: ""
  },

  processedByRole: {
    type: String,
    enum: ["agent", "admin"],
    default: null
  },

  // Rejection
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  rejectedByName: {
    type: String,
    default: ""
  },

  rejectionReason: {
    type: String,
    default: ""
  },

  approvedAt: Date,

  rejectedAt: Date,

  processedAt: Date,

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Indexes
withdrawalSchema.index({
  telegramId: 1,
  status: 1
});

withdrawalSchema.index({
  player: 1
});

withdrawalSchema.index({
  approvedBy: 1
});

withdrawalSchema.index({
  createdAt: -1,
  status: 1
});

module.exports =
  mongoose.model(
    "Withdrawal",
    withdrawalSchema
  );