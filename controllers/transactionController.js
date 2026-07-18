const Deposit = require("../models/Deposit");
const Withdrawal = require("../models/Withdrawal");
const User = require("../models/User");

exports.getPlayerTransactions = async (req, res) => {
  try {
    console.log("🔥 Transaction controller reached");
    console.log("Decoded JWT:", req.user);

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("Database user:", user);

    const deposits = await Deposit.find({
      $or: [
        { player: user._id },
        { telegramId: user.telegramId },
      ],
    });

    const withdrawals = await Withdrawal.find({
      $or: [
        { player: user._id },
        { telegramId: user.telegramId },
      ],
    });

    console.log("Deposits:", deposits.length);
    console.log("Withdrawals:", withdrawals.length);

    const depositHistory = deposits.map((d) => ({
  _id: d._id,
  type: "Deposit",
  amount: d.amount,
  status: d.status,
  method: d.method,
  reference: d.transactionId || d.depositNumber,
  createdAt: d.createdAt,
}));

const withdrawalHistory = withdrawals.map((w) => ({
  _id: w._id,
  type: "Withdrawal",
  amount: w.amount,
  status: w.status,
  method: w.method,
  reference: w.withdrawalNumber,
  createdAt: w.createdAt,
}));

    const transactions = [...depositHistory, ...withdrawalHistory].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    res.json({
      success: true,
      total: transactions.length,
      transactions,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};