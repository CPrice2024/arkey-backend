const express = require("express");

const router = express.Router();

console.log("✅ Transactions route loaded");

router.get("/", (req, res) => {
  res.json({
    success: true,
    route: "/api/transactions"
  });
});

router.get("/player", (req, res) => {
  console.log("🔥 PLAYER ROUTE HIT");

  res.json({
    success: true,
    route: "/api/transactions/player"
  });
});

module.exports = router;