const Deposit = require("../models/Deposit");
const Withdrawal = require("../models/Withdrawal");

exports.getPlayerTransactions = async (req, res) => {
  try {
    // Get deposits
    const deposits = await Deposit.find({
      player: req.user._id,
    })
      .select(
        "amount status method createdAt depositNumber transactionId"
      )
      .lean();

    // Get withdrawals
    const withdrawals = await Withdrawal.find({
      player: req.user._id,
    })
      .select(
        "amount status method createdAt withdrawalNumber accountNumber"
      )
      .lean();

    const depositHistory = deposits.map((item) => ({
      _id: item._id,
      type: "Deposit",
      amount: item.amount,
      status: item.status,
      method: item.method,
      reference:
        item.transactionId ||
        item.depositNumber,
      createdAt: item.createdAt,
    }));

    const withdrawalHistory =
      withdrawals.map((item) => ({
        _id: item._id,
        type: "Withdrawal",
        amount: item.amount,
        status: item.status,
        method: item.method,
        reference:
          item.withdrawalNumber,
        createdAt: item.createdAt,
      }));

    const transactions = [
      ...depositHistory,
      ...withdrawalHistory,
    ].sort(
      (a, b) =>
        new Date(b.createdAt) -
        new Date(a.createdAt)
    );

    res.json({
      success: true,
      total: transactions.length,
      transactions,
    });
  } catch (err) {
    console.log(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};