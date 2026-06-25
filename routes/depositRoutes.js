const express = require("express");
const auth = require("../middleware/auth");
const roles = require("../middleware/roles");
const router = express.Router();
const mongoose = require("mongoose");

const Deposit = require("../models/Deposit");
const User = require("../models/User");
const bot = require("../bot/telegramBot");

// =======================================
// GET ALL DEPOSITS (with filters & pagination)
// =======================================

router.get(
  "/",
  auth,
  roles("admin", "agent"),
  async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'all',
      startDate,
      endDate,
      search 
    } = req.query;

    // Build query
    let query = {};
    
    if (status !== 'all') {
      query.status = status;
    }
    
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (search) {
      query.$or = [
        { transactionId: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { depositNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const deposits = await Deposit.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Deposit.countDocuments(query);
    const pending = await Deposit.countDocuments({ status: 'pending' });
    const approved = await Deposit.countDocuments({ status: 'approved' });
    const rejected = await Deposit.countDocuments({ status: 'rejected' });
    const totalAmount = await Deposit.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.json({
      deposits,
      stats: {
        total,
        pending,
        approved,
        rejected,
        totalAmount: totalAmount[0]?.total || 0
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// =======================================
// GET SINGLE DEPOSIT
// =======================================

router.get(
  "/:id",
  auth,
  roles("admin", "agent"),
  async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    
    if (!deposit) {
      return res.status(404).json({ message: "Deposit not found" });
    }
    
    res.json(deposit);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// =======================================
// CREATE NEW DEPOSIT
// =======================================

router.post("/", async (req, res) => {
  try {
    const {
      telegramId,
      username,
      phone,
      method,
      amount,
      depositNumber,
      note,
      transactionId
    } = req.body;

    // Validate required fields
    if (!telegramId || !username || !method || !amount || !depositNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const deposit = new Deposit({
      telegramId,
      username,
      phone,
      method,
      amount: parseFloat(amount),
      depositNumber,
      note,
      transactionId,
      status: "pending",
      createdAt: new Date()
    });

    await deposit.save();

    // Notify admin via bot
    try {
      await bot.telegram.sendMessage(
        process.env.ADMIN_CHAT_ID,
        `
🆕 New Deposit Request

👤 User: ${username}
📱 Phone: ${phone || 'N/A'}
💳 Method: ${method}
💰 Amount: ${amount} ETB
🏦 Deposit Number: ${depositNumber}
🆔 Transaction ID: ${transactionId || 'N/A'}
📝 Note: ${note || 'N/A'}

⏰ Time: ${new Date().toLocaleString()}
        `
      );
    } catch (botError) {
      console.log("Bot notification failed:", botError.message);
    }

    res.status(201).json({
      message: "Deposit created successfully",
      deposit
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// =======================================
// APPROVE DEPOSIT
// =======================================

router.put(
  "/:id/approve",
  auth,
  roles("admin", "agent"),
  async (req, res) => {

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const deposit = await Deposit.findById(req.params.id).session(session);

    if (!deposit) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: "Deposit not found" });
    }

    // Prevent double approval
    if (deposit.status === "approved") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Deposit already approved" });
    }

    if (deposit.status === "rejected") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: "Cannot approve rejected deposit" });
    }

    const amount = deposit.amount || 0;

    // Update deposit status
    deposit.status = "approved";

deposit.approvedAt = new Date();

deposit.approvedBy = req.user._id;

deposit.approvedByName =
  req.user.username;

deposit.processedByRole =
  req.user.role;

deposit.processedAt =
  new Date();
    await deposit.save({ session });

    // Update user balance
   const user = await User.findOne({
  telegramId: deposit.telegramId
}).session(session);

console.log("APPROVE USER:", {
  telegramId: user?.telegramId,
  username: user?.username,
  firstName: user?.firstName
});

if (user) {

  if (!user.username) {
    console.log("MISSING USERNAME!");

    user.username =
      user.firstName ||
      `user_${user.telegramId}`;
  }

  user.balance =
    (user.balance || 0) + amount;

  user.totalDeposited =
    (user.totalDeposited || 0) + amount;

  await user.save({ session });


      // Send Telegram notification to user
      try {
        await bot.telegram.sendMessage(
          deposit.telegramId,
          `
✅ *Deposit Approved*

💳 Method: ${deposit.method}
💰 Amount: *${amount} ETB*
🧾 Transaction ID: ${deposit.transactionId || 'N/A'}

💵 New Balance: *${user.balance.toLocaleString()} ETB*

🎉 Thank you for using Arkey Bet.
          `,
          { parse_mode: 'Markdown' }
        );
      } catch (telegramError) {
        console.log("Telegram notification failed:", telegramError.message);
      }
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: "Deposit approved successfully",
      deposit,
      userBalance: user?.balance || 0
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.log(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// =======================================
// REJECT DEPOSIT
// =======================================

router.put(
  "/:id/reject",
  auth,
  roles("admin", "agent"),
  async (req, res) => {

  new Date();
  try {
    const deposit = await Deposit.findById(req.params.id);
    deposit.rejectedBy =
  req.user._id;

deposit.rejectedByName =
  req.user.username;

deposit.rejectionReason =
  req.body.reason || "";

deposit.processedByRole =
  req.user.role;

deposit.processedAt =
  new Date();

    if (!deposit) {
      return res.status(404).json({ message: "Deposit not found" });
    }

    if (deposit.status === "approved") {
      return res.status(400).json({ message: "Cannot reject approved deposit" });
    }

    deposit.status = "rejected";
    deposit.rejectedAt = new Date();
    await deposit.save();

    // Send rejection notification to user
    try {
      await bot.telegram.sendMessage(
        deposit.telegramId,
        `
❌ *Deposit Rejected*

💳 Method: ${deposit.method}
💰 Amount: ${deposit.amount} ETB

📝 Reason: ${req.body.reason || 'Please contact support for more information'}

ℹ️ Please submit a new deposit request with correct details.
        `,
        { parse_mode: 'Markdown' }
      );
    } catch (telegramError) {
      console.log("Telegram notification failed:", telegramError.message);
    }

    res.json({
      message: "Deposit rejected successfully",
      deposit
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// =======================================
// BULK APPROVE DEPOSITS
// =======================================

router.post(
  "/bulk-approve",
  auth,
  roles("admin", "agent"),
  async (req, res) => {

  try {
    const { depositIds } = req.body;

    if (!depositIds || depositIds.length === 0) {
      return res.status(400).json({ message: "No deposit IDs provided" });
    }

    const deposits = await Deposit.find({
      _id: { $in: depositIds },
      status: "pending"
    }).session(session);

    let approvedCount = 0;
    let totalAmount = 0;

    for (const deposit of deposits) {
      deposit.status =
    "approved";

  deposit.approvedAt =
    new Date();

  deposit.approvedBy =
    req.user._id;

  deposit.approvedByName =
    req.user.username;

  deposit.processedByRole =
    req.user.role;

  deposit.processedAt =
    new Date();

  await deposit.save({
    session
  });
  const amount = deposit.amount || 0;

  deposit.status = "approved";
  deposit.approvedAt = new Date();

  await deposit.save({ session });

  const user = await User.findOne({
    telegramId: deposit.telegramId
  }).session(session);

  console.log("DEPOSIT USER:", deposit.telegramId);

  console.log("FOUND USER:", {
    telegramId: user?.telegramId,
    username: user?.username,
    firstName: user?.firstName
  });

  if (user) {

    if (!user.username) {
      console.log("MISSING USERNAME!");

      user.username =
        user.firstName ||
        `user_${user.telegramId}`;
    }

    user.balance =
      (user.balance || 0) + amount;

    user.totalDeposited =
      (user.totalDeposited || 0) + amount;

    await user.save({ session });

    totalAmount += amount;
    approvedCount++;
  }
}

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: `Successfully approved ${approvedCount} deposits`,
      totalAmount,
      approvedCount
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// =======================================
// GET DEPOSIT STATISTICS
// =======================================

router.get(
  "/stats/summary",
  auth,
  roles("admin", "agent"),
  async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const [todayStats, weekStats, monthStats, allStats] = await Promise.all([
      Deposit.aggregate([
        { $match: { createdAt: { $gte: today }, status: "approved" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
      ]),
      Deposit.aggregate([
        { $match: { createdAt: { $gte: weekAgo }, status: "approved" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
      ]),
      Deposit.aggregate([
        { $match: { createdAt: { $gte: monthAgo }, status: "approved" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
      ]),
      Deposit.aggregate([
        { $match: { status: "approved" } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      today: {
        amount: todayStats[0]?.total || 0,
        count: todayStats[0]?.count || 0
      },
      week: {
        amount: weekStats[0]?.total || 0,
        count: weekStats[0]?.count || 0
      },
      month: {
        amount: monthStats[0]?.total || 0,
        count: monthStats[0]?.count || 0
      },
      all: {
        amount: allStats[0]?.total || 0,
        count: allStats[0]?.count || 0
      }
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// =======================================
// DELETE DEPOSIT (Admin only)
// =======================================

router.delete(
  "/:id",
  auth,
  roles("admin"),
  async (req, res) => {
  try {
    const deposit = await Deposit.findById(req.params.id);
    
    if (!deposit) {
      return res.status(404).json({ message: "Deposit not found" });
    }

    if (deposit.status === "approved") {
      
      const user = await User.findOne({ 
        telegramId: deposit.telegramId 
      });
      if (user) {
        user.balance = Math.max(0, user.balance - (deposit.amount || 0));
        await user.save();
      }
    }

    await deposit.deleteOne();
    
    res.json({ message: "Deposit deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// =======================================
// EXPORT
// =======================================

module.exports = router;