const express = require("express");
console.log("🔥 WITHDRAWAL ROUTES LOADED");
const auth = require("../middleware/auth");
const roles = require("../middleware/roles");
const router = express.Router();

const Withdrawal = require("../models/Withdrawal");
const User = require("../models/User");

router.post(
  "/",
  auth,
  async (req, res) => {

    try {

      const {
        method,
        amount,
        accountNumber,
        note
      } = req.body;

      const player =
        await User.findById(req.user._id);

      if (!player) {
        return res.status(404).json({
          message: "Player not found"
        });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({
          message: "Invalid amount"
        });
      }

      if (!accountNumber) {
        return res.status(400).json({
          message: "Account number is required"
        });
      }

      const withdrawalNumber =
        "WD" +
        Date.now() +
        Math.floor(Math.random() * 1000);

      const withdrawal =
        await Withdrawal.create({

          telegramId: player.telegramId,

          username: player.username,

          phone: player.phone,

          method,

          amount,

          withdrawalNumber,

          accountNumber,

          note,

          player: player._id,

          status: "pending"

        });

      res.status(201).json({

        message:
          "Withdrawal submitted successfully.",

        withdrawal

      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error.message
      });

    }

});

router.get(
  "/",
  auth,
  roles("admin", "agent"),
  async (req, res) => {

  const withdrawals = await Withdrawal.find()
    .sort({ createdAt: -1 });

  res.json({ withdrawals });
});

router.put(
  "/:id/approve",
  auth,
  roles("admin", "agent"),
  async (req, res) => {

    try {

      const withdrawal = await Withdrawal.findById(req.params.id);

      if (!withdrawal) {
        return res.status(404).json({
          message: "Withdrawal not found"
        });
      }

      if (withdrawal.status !== "pending") {
        return res.status(400).json({
          message: "Withdrawal already processed"
        });
      }

      const player = await User.findById(withdrawal.player);

      if (!player) {
        return res.status(404).json({
          message: "Player not found"
        });
      }

      if (player.balance < withdrawal.amount) {
        return res.status(400).json({
          message: "Insufficient balance"
        });
      }

      // Deduct balance
      player.balance -= withdrawal.amount;
      await player.save();

      withdrawal.status = "approved";
      withdrawal.approvedAt = new Date();
      withdrawal.approvedBy = req.user._id;
      withdrawal.approvedByName = req.user.username;
      withdrawal.processedByRole = req.user.role;
      withdrawal.processedAt = new Date();

      await withdrawal.save();

      try {

        if (global.bot) {

          await global.bot.telegram.sendMessage(
            withdrawal.telegramId,
            `
✅ Withdrawal Approved

💰 Amount:
${withdrawal.amount} Birr

💳 Remaining Balance:
${player.balance} Birr
`
          );

        }

      } catch (err) {

        console.log(err.message);

      }

      res.json({
        success: true,
        message: "Withdrawal approved successfully."
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error.message
      });

    }

  }
);

router.put(
  "/:id/reject",
  auth,
  roles("admin", "agent"),
  async (req, res) => {

    try {

      const withdrawal =
        await Withdrawal.findById(req.params.id);

      if (!withdrawal) {
        return res.status(404).json({
          message: "Withdrawal not found"
        });
      }

      if (withdrawal.status === "approved") {
        return res.status(400).json({
          message: "Cannot reject an approved withdrawal"
        });
      }

      if (withdrawal.status === "rejected") {
        return res.status(400).json({
          message: "Withdrawal already rejected"
        });
      }

     withdrawal.status = "rejected";
withdrawal.rejectedAt = new Date();

withdrawal.rejectedBy = req.user._id;
withdrawal.rejectedByName = req.user.username;
withdrawal.processedByRole = req.user.role;
withdrawal.rejectionReason = req.body.reason || "";
withdrawal.processedAt = new Date();

await withdrawal.save();

      try {

        await global.bot.telegram.sendMessage(
          withdrawal.telegramId,
          `
❌ Withdrawal Rejected

💰 Refunded:
${withdrawal.amount} Birr

💳 Current Balance:
${user ? user.balance : 0} Birr

Reason:
${withdrawal.rejectionReason || "Please contact support."}
`
        );

      } catch (telegramError) {

        console.log(
          "Telegram Error:",
          telegramError.message
        );

      }

      res.json({
        success: true,
        message: "Withdrawal rejected successfully"
      });

    } catch (error) {

      console.error(
        "WITHDRAWAL REJECT ERROR:"
      );

      console.error(error);

      res.status(500).json({
        message: error.message,
        stack: error.stack
      });

    }

  }
);

module.exports = router;