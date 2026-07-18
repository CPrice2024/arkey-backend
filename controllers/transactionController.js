const Deposit = require("../models/Deposit");
const Withdrawal = require("../models/Withdrawal");

exports.getPlayerTransactions = async (req, res) => {
  try {
    const deposits = await Deposit.find({
      player: req.user._id,
    });

    const withdrawals = await Withdrawal.find({
      player: req.user._id,
    });

    const depositHistory = deposits.map((d) => ({
      type: "Deposit",
      amount: d.amount,
      status: d.status,
      method: d.method,
      reference: d.transactionId || d.depositNumber,
      createdAt: d.createdAt,
    }));

    const withdrawalHistory = withdrawals.map((w) => ({
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