const User = require("../models/User");
const GameTransaction = require("../models/GameTransaction");

exports.callback = async (req, res) => {
  try {
    console.log("========== INOUT CALLBACK ==========");
    console.log(req.body);

    const action = req.body.action;

    switch (action) {
      case "session":
        return session(req, res);

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

async function session(req, res) {
  return res.json({
    code: "OK",
    message: "Session endpoint working",
  });
}

async function balance(req, res) {
  return res.json({
    code: "OK",
    message: "Balance endpoint working",
  });
}

async function bet(req, res) {
  return res.json({
    code: "OK",
    message: "Bet endpoint working",
  });
}

async function credit(req, res) {
  return res.json({
    code: "OK",
    message: "Credit endpoint working",
  });
}

async function refund(req, res) {
  return res.json({
    code: "OK",
    message: "Refund endpoint working",
  });
}

async function rollback(req, res) {
  return res.json({
    code: "OK",
    message: "Rollback endpoint working",
  });
}