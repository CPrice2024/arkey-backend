const User = require("../models/User");
const GameTransaction = require("../models/GameTransaction");
const mongoose = require("mongoose");


async function processWalletTransaction({
  token,
  transactionId,
  debitId = null,
  gameId,
  gameMode,
  amount,
  action,
  coefficient = null,
  increment = true,
}) {

  const session = await mongoose.startSession();

  try {

    session.startTransaction();

    const user = await User.findOne({
      gameToken: token,
    }).session(session);

    if (!user) {
      throw new Error("INVALID_TOKEN");
    }

    const exists = await GameTransaction.findOne({
      transactionId,
    }).session(session);

    if (exists) {

      await session.abortTransaction();

      session.endSession();

      return {
        duplicate: true,
        balance: user.balance,
      };

    }

    const balanceBefore = user.balance;

    if (!increment && user.balance < Number(amount)) {

      await session.abortTransaction();

      session.endSession();

      return {
        insufficient: true,
        balance: user.balance,
      };

    }

    user.balance = increment
      ? user.balance + Number(amount)
      : user.balance - Number(amount);

    await user.save({ session });

    await GameTransaction.create(
      [{
        player: user._id,
        telegramId: user.telegramId,
        transactionId,
        debitId,
        gameId,
        gameMode,
        action,
        amount,
        result: increment ? amount : 0,
        coefficient,
        currency: "USD",
        balanceBefore,
        balanceAfter: user.balance,
        status: "success",
        isFinished: true,
      }],
      { session }
    );

    await session.commitTransaction();

    session.endSession();

    return {
      success: true,
      balance: user.balance,
    };

  } catch (err) {

    await session.abortTransaction();

    session.endSession();

    throw err;

  }

}

exports.callback = async (req, res) => {
  try {
    console.log("========== INOUT CALLBACK ==========");
    console.log(req.body);

    const action = req.body.action;

    switch (action) {
      case "init":
         return init(req, res);

      case "balance":
        return balance(req, res);

      case "bet":
        return bet(req, res);

      case "credit":
        return credit(req, res);

      case "refund":
        return refund(req, res);

      case "rollback":
        return rollback(req, res);

      default:
        return res.json({
          code: "UNKNOWN_ACTION",
          message: "Unknown action",
        });
    }
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      code: "SERVER_ERROR",
      message: err.message,
    });
  }
};

async function init(req, res) {

  const token = req.body.token;

  const user = await User.findOne({
    gameToken: token
  });

  if (!user) {
    return res.json({
      code: "INVALID_TOKEN",
      message: "Player not found"
    });
  }

  if (
    !user.gameTokenExpires ||
    user.gameTokenExpires < new Date()
  ) {
    return res.json({
      code: "TOKEN_EXPIRED",
      message: "Game session expired"
    });
  }

  return res.json({
    code: "OK",
    player: {
      id: user.telegramId,
      username: user.username,
      currency: "USD"
    }
  });

}

async function balance(req, res) {

  const token = req.body.token;

  const user = await User.findOne({
    gameToken: token
  });

  if (!user) {
    return res.json({
      code: "INVALID_TOKEN",
      message: "Player not found"
    });
  }

  return res.json({
    code: "OK",
    balance: Number(user.balance.toFixed(2)),
    currency: "USD"
  });

}
async function bet(req, res) {

  try {

    const result = await processWalletTransaction({

      token: req.body.token,

      transactionId: req.body.transactionId,

      gameId: req.body.gameId,

      gameMode: req.body.gameMode,

      amount: req.body.amount,

      action: "bet",

      increment: false,

    });

    if (result.duplicate) {

      return res.json({
        code: "OK",
        balance: result.balance,
        currency: "USD",
      });

    }

    if (result.insufficient) {

      return res.json({
        code: "INSUFFICIENT_FUNDS",
        balance: result.balance,
      });

    }

    return res.json({
      code: "OK",
      balance: result.balance,
      currency: "USD",
    });

  } catch (err) {

    console.log(err);

    return res.status(500).json({
      code: "SERVER_ERROR",
      message: err.message,
    });

  }

}

async function credit(req, res) {

  try {

    const result = await processWalletTransaction({

      token: req.body.token,

      transactionId: req.body.transactionId,

      debitId: req.body.debitId,

      gameId: req.body.gameId,

      gameMode: req.body.gameMode,

      amount: req.body.amount,

      coefficient: req.body.coefficient,

      action: "credit",

      increment: true,

    });

    return res.json({

      code: "OK",

      balance: result.balance,

      currency: "USD",

    });

  } catch (err) {

    console.log(err);

    return res.status(500).json({

      code: "SERVER_ERROR",

      message: err.message,

    });

  }

}

async function refund(req, res) {

  try {

    const result = await processWalletTransaction({

      token: req.body.token,

      transactionId: req.body.transactionId,

      debitId: req.body.debitId,

      gameId: req.body.gameId,

      gameMode: req.body.gameMode,

      amount: req.body.amount,

      action: "refund",

      increment: true,

    });

    return res.json({

      code: "OK",

      balance: result.balance,

      currency: "USD",

    });

  } catch (err) {

    console.log(err);

    return res.status(500).json({

      code: "SERVER_ERROR",

      message: err.message,

    });

  }

}

async function rollback(req, res) {

  try {

    const result = await processWalletTransaction({

      token: req.body.token,

      transactionId: req.body.transactionId,

      debitId: req.body.debitId,

      gameId: req.body.gameId,

      gameMode: req.body.gameMode,

      amount: req.body.amount,

      action: "rollback",

      increment: true,

    });

    return res.json({

      code: "OK",

      balance: result.balance,

      currency: "USD",

    });

  } catch (err) {

    console.log(err);

    return res.status(500).json({

      code: "SERVER_ERROR",

      message: err.message,

    });

  }

}