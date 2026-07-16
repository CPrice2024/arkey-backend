const Game = require("../models/Game");

exports.importGames = async (req, res) => {

    try {

        const games = req.body.games;

        if (!Array.isArray(games)) {

            return res.status(400).json({
                message: "games array required"
            });

        }

        let inserted = 0;
        let updated = 0;

        for (const game of games) {

            const existing =
                await Game.findOne({
                    providerGameId: game.providerGameId
                });

            if (existing) {

                await Game.updateOne(
                    {
                        providerGameId: game.providerGameId
                    },
                    game
                );

                updated++;

            } else {

                await Game.create(game);

                inserted++;

            }

        }

        return res.json({

            success: true,

            inserted,

            updated,

            total: inserted + updated

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            message: err.message
        });

    }

};