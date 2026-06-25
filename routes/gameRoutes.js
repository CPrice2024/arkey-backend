const express = require("express");
const auth = require("../middleware/auth");
const roles = require("../middleware/roles");

const User = require("../models/User");

const router = express.Router();

router.get(
  "/",
  auth,
  roles("player"),
  async (req, res) => {

    try {

      const player =
        await User.findById(
          req.user._id
        );

      if (!player) {
        return res.status(404).json({
          message: "Player not found"
        });
      }

      res.json({
        success: true,

        player: {
          id: player._id,
          username: player.username,
          firstName: player.firstName,
          balance: player.balance,
          totalDeposited:
            player.totalDeposited,
          totalWithdrawn:
            player.totalWithdrawn
        },

        stats: {
          activeGames: 0,
          totalBets: 0,
          wins: 0,
          losses: 0
        },

        recentBets: []
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error.message
      });

    }

  }
);

module.exports = router;