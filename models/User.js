const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    telegramId: {
      type: String,
      unique: true,
      sparse: true
    },

    username: {
      type: String,
      required: true
    },

    firstName: {
      type: String,
      default: ""
    },

    lastName: {
      type: String,
      default: ""
    },

    phone: {
      type: String,
      default: ""
    },

    email: {
      type: String,
      unique: true,
      sparse: true
    },

    password: {
      type: String,
      default: ""
    },

    role: {
      type: String,
      enum: [
        "player",
        "agent",
        "admin"
      ],
      default: "player"
    },
    language: {
  type: String,
  enum: ["en", "am", "om"],
  default: "en"
},

    balance: {
      type: Number,
      default: 0
    },
    gameToken: {
  type: String,
  unique: true,
  sparse: true,
  index: true,
},

gameTokenExpires: {
  type: Date,
  default: null,
},

    totalDeposited: {
      type: Number,
      default: 0
    },

    totalWithdrawn: {
      type: Number,
      default: 0
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

userSchema.index({ balance: -1 });
userSchema.index({ totalDeposited: -1 });

module.exports = mongoose.model(
  "User",
  userSchema
);