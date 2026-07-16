const express = require("express");
const auth = require("../middleware/auth");
const { launchGame } = require("../controllers/gameLaunchController");

const router = express.Router();

// Launch Game
router.get(
  "/launch",
  auth,
  launchGame
);

module.exports = router;