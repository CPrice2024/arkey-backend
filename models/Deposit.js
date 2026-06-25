const mongoose = require("mongoose");
console.log("🔥 Deposit model loaded fresh");
const depositSchema = new mongoose.Schema({
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
    enum: ['telebirr', 'cbe', 'helloCash', 'bank']
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  depositNumber: {
    type: String,
    required: true,
    unique: true
  },
  note: {
    type: String,
    default: ""
  },
  transactionId: {
    type: String,
    default: "",
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true
  },
  approvedAt: {
    type: Date
  },
  rejectedAt: {
    type: Date
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

rejectedByName: {
  type: String,
  default: ""
},

rejectionReason: {
  type: String,
  default: ""
},

approvedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null
},

rejectedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null
},

player: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null
},
receiptImage: {
  type: String,
  default: ""
},
processedAt: {
  type: Date
},

  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});


// Compound index for better query performance
depositSchema.index({ telegramId: 1, status: 1 });
depositSchema.index({ createdAt: -1, status: 1 });
depositSchema.index({
  approvedBy: 1
});

depositSchema.index({
  player: 1
});

depositSchema.index({
  status: 1,
  processedAt: -1
});

module.exports = mongoose.model("Deposit", depositSchema);