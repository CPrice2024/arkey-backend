const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const Game = require("../models/Game");

async function importGames() {

    await mongoose.connect(process.env.MONGO_URI);

    console.log("MongoDB Connected");

    const games = JSON.parse(
        fs.readFileSync(
            path.join(__dirname, "../data/games.json"),
            "utf8"
        )
    );

    await Game.deleteMany({
        provider: "InOut"
    });

    await Game.insertMany(games);

    console.log(`${games.length} games imported.`);

    mongoose.connection.close();

}

importGames();