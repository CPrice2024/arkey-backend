const express = require("express");
const auth = require("../middleware/auth");
const {
  getPlayerTransactions,
} = require("../controllers/transactionController");

const router = express.Router();

router.get("/player", auth, getPlayerTransactions);

module.exports = router;