const Game = require("../models/Game");

exports.getCatalog = async (req, res) => {
    try {
         console.log("QUERY:", req.query);

        const {
            page = 1,
            limit = 1000,
            category,
            provider,
            search,
            popular
        } = req.query;

        const filter = {
            enabled: true
        };

        if (category) {
            filter.category = category;
        }

        if (provider) {
            filter.provider = provider;
        }

        if (search) {
            filter.gameName = {
                $regex: search,
                $options: "i"
            };
        }

        let sort = {
            gameName: 1
        };

        if (popular === "true") {
            sort = {
                launchCount: -1
            };
        }
        console.log("FILTER:", filter);
        const total = await Game.countDocuments(filter);

        const games = await Game.find(filter)
            .sort(sort)
            .skip((page - 1) * Number(limit))
            .limit(Number(limit));
            console.log(
    "FOUND:",
    games.map(g => g.gameName)
);
       
       console.log("RETURN COUNT:", games.length);
console.log("RETURN:", games.map(g => g.gameName));
        res.json({

            success: true,

            pagination: {

                currentPage: Number(page),

                totalPages: Math.ceil(total / limit),

                totalGames: total,

                limit: Number(limit)

            },

            count: games.length,

            games

        });

    } catch (err) {

        console.log(err);

        res.status(500).json({

            success: false,

            message: err.message

        });

    }
};