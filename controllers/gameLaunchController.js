const crypto = require("crypto");
const User = require("../models/User");
const Game = require("../models/Game");

exports.launchGame = async (req, res) => {

    try {

        const gameId = req.query.gameId;

        if (!gameId) {
            return res.status(400).json({
                message: "gameId required"
            });
        }

        const game = await Game.findById(gameId);

        if (!game) {
            return res.status(404).json({
                message: "Game not found"
            });
        }

        if (!game.enabled) {
            return res.status(400).json({
                message: "Game disabled"
            });
        }

        const user = await User.findById(req.user._id);

        const token = crypto
            .randomBytes(32)
            .toString("hex");

        user.gameToken = token;

        user.gameTokenExpires =
            new Date(Date.now() + 2 * 60 * 60 * 1000);

        await user.save();

        game.launchCount += 1;

        game.lastPlayed = new Date();

        await game.save();

        res.json({

            success: true,

            game: {

                id: game._id,

                providerGameId:
                    game.providerGameId,

                name:
                    game.gameName,

                provider:
                    game.provider,

                image:
                    game.image,

                category:
                    game.category

            },

            launchUrl:
                `${process.env.INOUT_FRAME_URL}?token=${token}`

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({

            message: err.message

        });

    }

};