const mongoose = require("mongoose");

const gameTransactionSchema = new mongoose.Schema({

    player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    telegramId: {
        type: String,
        index: true
    },

    transactionId: {
        type: String,
        required: true,
        unique: true
    },

    debitId: {
        type: String,
        default: null
    },

    roundId: {
        type: String,
        default: null
    },

    providerGameId: {
        type: String,
        default: null
    },

    gameId: String,

    gameMode: String,

    action: {
        type: String,
        enum: [
            "bet",
            "credit",
            "refund",
            "rollback"
        ],
        required: true
    },

    amount: {
        type: Number,
        default: 0
    },

    result: {
        type: Number,
        default: 0
    },

    coefficient: Number,

    currency: {
        type: String,
        default: "USD"
    },

    balanceBefore: Number,

    balanceAfter: Number,

    status: {
        type: String,
        enum: [
            "success",
            "rollback",
            "refund"
        ],
        default: "success"
    },

    isFinished: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

module.exports = mongoose.model(
    "GameTransaction",
    gameTransactionSchema
);