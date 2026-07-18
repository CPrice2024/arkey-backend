const express = require("express");
const auth = require("../middleware/auth");
console.log("🔥 NEW TRANSACTION ROUTE FILE");
const {
  getPlayerTransactions,
} = require("../controllers/transactionController");

const router = express.Router();

router.get("/player", auth, getPlayerTransactions);

module.exports = router;