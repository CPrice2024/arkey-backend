const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const mongoose = require("mongoose");
require("dotenv").config();

const Game = require("../models/Game");

async function importGames() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        console.log("✅ MongoDB Connected");

        const games = [];

        const csvPath = path.join(__dirname, "../data/games.csv");

console.log("CSV Path:", csvPath);
console.log("Exists:", fs.existsSync(csvPath));

fs.createReadStream(csvPath)
    .on("error", (err) => {
        console.error("CSV Error:", err);
    })
    .pipe(csv())
            .pipe(csv())
            .on("data", (row) => {

                games.push({
                    provider: "InOut",

                    providerGameId:
                        row["Game ID"]?.trim(),

                    gameName:
                        row["Game"]?.trim(),

                    category:
                        row["Category"]?.trim() || "Other",

                    image: "",

                    demo: false,

                    mobile:
                        row["Available devices"]
                            ?.toLowerCase()
                            .includes("mobile") || true,

                    enabled: true,

                    popularity: 0
                });

            })

            .on("end", async () => {

                let inserted = 0;
                let updated = 0;

                for (const game of games) {

                    const result = await Game.updateOne(
                        {
                            providerGameId:
                                game.providerGameId
                        },
                        {
                            $set: game
                        },
                        {
                            upsert: true
                        }
                    );

                    if (result.upsertedCount)
                        inserted++;
                    else
                        updated++;
                }

                console.log("");

                console.log("=================================");
                console.log("Import Finished");
                console.log("Inserted :", inserted);
                console.log("Updated  :", updated);
                console.log("Total    :", games.length);
                console.log("=================================");

                mongoose.connection.close();

            });

    } catch (err) {

        console.error(err);

    }
}

importGames();