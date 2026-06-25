const express = require("express");
const auth = require("../middleware/auth");
const roles = require("../middleware/roles");
const router = express.Router();

const Withdrawal = require("../models/Withdrawal");
const User = require("../models/User");

// =====================================
// GET ALL WITHDRAWALS
// =====================================

router.get(
  "/",
  auth,
  roles("admin", "agent"),
  async (req, res) => {

  const withdrawals = await Withdrawal.find()
    .sort({ createdAt: -1 });

  res.json({ withdrawals });
});

// =====================================
// APPROVE WITHDRAWAL
// =====================================

router.put(
  "/:id/approve",
  auth,
  roles("admin", "agent"),
  async (req, res) => {

  try {

    const withdrawal =
      await Withdrawal.findById(req.params.id);
      withdrawal.approvedBy =
  req.user._id;

withdrawal.approvedByName =
  req.user.username;

withdrawal.processedByRole =
  req.user.role;

withdrawal.processedAt =
  new Date();

    if (!withdrawal) {
      return res.status(404).json({
        message: "Withdrawal not found"
      });
    }

    withdrawal.status = "approved";
    withdrawal.approvedAt = new Date();
    console.log("WITHDRAWAL:");
console.log(withdrawal);

    await withdrawal.save();

    await global.bot.telegram.sendMessage(
      withdrawal.telegramId,
      `
✅ Withdrawal Approved

💰 Amount:
${withdrawal.amount} Birr
`
    );

    res.json({
      success: true
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: error.message
    });
  }
});
// =====================================
// REJECT WITHDRAWAL
// =====================================

router.put(
  "/:id/reject",
  auth,
  roles("admin", "agent"),
  async (req, res) => {

  try {

    const withdrawal =
      await Withdrawal.findById(req.params.id);

      withdrawal.rejectedBy =
  req.user._id;

withdrawal.rejectedByName =
  req.user.username;

withdrawal.processedByRole =
  req.user.role;

withdrawal.rejectionReason =
  req.body.reason || "";

withdrawal.processedAt =
  new Date();

    if (!withdrawal) {
      return res.status(404).json({
        message: "Withdrawal not found"
      });
    }

    const user =
      await User.findOne({
        telegramId:
          withdrawal.telegramId
      });

    if (user) {

      user.balance =
        Number(user.balance) +
        Number(withdrawal.amount);

      await user.save();
    }

    withdrawal.status = "rejected";

    await withdrawal.save();

    await global.bot.telegram.sendMessage(
      withdrawal.telegramId,
      `
❌ Withdrawal Rejected

💰 Refunded:
${withdrawal.amount} Birr

💳 Current Balance:
${user.balance} Birr
`
    );

    res.json({
      success: true
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: error.message
    });
  }
});

module.exports = router;