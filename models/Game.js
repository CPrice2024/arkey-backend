const mongoose = require("mongoose");

const gameSchema = new mongoose.Schema(
{
    provider: {
        type: String,
        required: true
    },

    providerGameId: {
        type: String,
        required: true,
        unique: true
    },

    gameName: {
        type: String,
        required: true
    },

    category: {
        type: String,
        default: "Other"
    },

    image: String,

    demo: {
        type: Boolean,
        default: false
    },

    mobile: {
        type: Boolean,
        default: true
    },

    enabled: {
        type: Boolean,
        default: true
    },

    popularity: {
        type: Number,
        default: 0
    },

    launchCount: {
        type: Number,
        default: 0
    },

    lastPlayed: {
        type: Date,
        default: null
    }

},
{
    timestamps: true
});

module.exports = mongoose.model(
    "Game",
    gameSchema
);