const express = require("express");
const auth = require("../middleware/auth");
const roles = require("../middleware/roles");
const router = express.Router();

const Withdrawal = require("../models/Withdrawal");
const User = require("../models/User");

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

      const user = await User.findOne({
        telegramId: withdrawal.telegramId
      });

      if (user) {

        user.balance =
          Number(user.balance || 0) +
          Number(withdrawal.amount || 0);

        await user.save();

      }

      withdrawal.status = "rejected";
      withdrawal.rejectedAt = new Date();

      withdrawal.rejectedBy =
        req.user._id;

      withdrawal.rejectedByName =
        req.user.username ||
        req.user.firstName ||
        "Admin";

      withdrawal.processedByRole =
        req.user.role;

      withdrawal.rejectionReason =
        req.body?.reason || "";

      withdrawal.processedAt =
        new Date();

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