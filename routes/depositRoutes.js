const express = require("express");
const auth = require("../middleware/auth");
const roles = require("../middleware/roles");
const router = express.Router();
const mongoose = require("mongoose");

const Deposit = require("../models/Deposit");
const User = require("../models/User");
const bot = require("../bot/telegramBot");



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
      processedBy = "all",
      startDate,
      endDate,
      search 
    } = req.query;

    // Build query
    let query = {};
    
    if (status !== 'all') {
      query.status = status;
    }
    query.$and = [];

if (processedBy !== "all") {

  const processorRegex = new RegExp(
    `^${processedBy}$`,
    "i"
  );

  query.$and.push({
    $or: [
      { approvedByName: processorRegex },
      { rejectedByName: processorRegex }
    ]
  });

}
if (search) {

  query.$and.push({

    $or: [

      {
        transactionId: {
          $regex: search,
          $options: "i"
        }
      },

      {
        username: {
          $regex: search,
          $options: "i"
        }
      },

      {
        depositNumber: {
          $regex: search,
          $options: "i"
        }
      }

    ]

  });

}


if (query.$and && query.$and.length === 0) {
  delete query.$and;
}

    
    if (startDate && endDate) {
      query.createdAt = {
  $gte: new Date(startDate),
  $lte: new Date(
    new Date(endDate).setHours(
      23,
      59,
      59,
      999
    )
  )
};
    }
    

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const deposits = await Deposit.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Deposit.countDocuments(query);
    const pending = await Deposit.countDocuments({
  ...query,
  status: "pending"
});

const approved = await Deposit.countDocuments({
  ...query,
  status: "approved"
});

const rejected = await Deposit.countDocuments({
  ...query,
  status: "rejected"
});
const totalAmount = await Deposit.aggregate([
  {
    $match: {
      ...query,
      status: "approved"
    }
  },
  {
    $group: {
      _id: null,
      total: {
        $sum: "$amount"
      }
    }
  }
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
router.get(
  "/processors",
  auth,
  roles("admin", "agent"),
  async (req, res) => {
    try {

      const admins = await User.find(
        { role: "admin" },
        "username role"
      ).sort({
        username: 1
      });

      const agents = await User.find(
        { role: "agent" },
        "username role"
      ).sort({
        username: 1
      });

      return res.json({
        admins,
        agents
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: "Server Error"
      });

    }
  }
);


router.post("/", auth, async (req, res) => {
  try {
    const {
  method,
  amount,
  transactionId,
  note
} = req.body;

const user = await User.findById(req.user._id);

if (!user) {
  return res.status(404).json({
    message: "Player not found"
  });
}

    // Validate required fields
    if (!method || !amount) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const telebirrNumbers = [
  "0911223344",
  "0922334455",
  "0933445566",
  "0944556677",
  "0955667788"
];

const cbeNumbers = [
  "0966778899",
  "0977889900",
  "0988990011",
  "0999001122",
  "0910112233"
];

const list =
  method === "telebirr"
    ? telebirrNumbers
    : cbeNumbers;

const depositNumber =
  list[
    Math.floor(Math.random() * list.length)
  ];

    const deposit = new Deposit({

  telegramId: user.telegramId,

  username:
    user.username ||
    user.firstName,

  phone:
    user.phone,

  player:
    user._id,

  method,

  amount: Number(amount),

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

👤 User: ${user.username || user.firstName}
📱 Phone: ${user.phone || "N/A"}
💳 Method: ${method}
💰 Amount: ${amount} Birr
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
💰 Amount: *${amount} Birr*
🧾 Transaction ID: ${deposit.transactionId || 'N/A'}

💵 New Balance: *${user.balance.toLocaleString()} Birr*

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


router.put(
  "/:id/reject",
  auth,
  roles("admin", "agent"),
  async (req, res) => {

    try {

      const deposit = await Deposit.findById(req.params.id);

      if (!deposit) {
        return res.status(404).json({
          message: "Deposit not found"
        });
      }

      if (deposit.status === "approved") {
        return res.status(400).json({
          message: "Cannot reject approved deposit"
        });
      }

      deposit.status = "rejected";
      deposit.rejectedAt = new Date();

      deposit.rejectedBy = req.user._id;
      deposit.rejectedByName =
        req.user.username ||
        req.user.firstName ||
        "Admin";

      deposit.rejectionReason =
        req.body?.reason || "";

      deposit.processedByRole =
        req.user.role;

      deposit.processedAt =
        new Date();

      await deposit.save();

      try {

        await bot.telegram.sendMessage(
          deposit.telegramId,
          `❌ Deposit Rejected

Amount: ${deposit.amount} Birr

Reason:
${deposit.rejectionReason || "Please contact support."}`
        );

      } catch (err) {

        console.log(
          "Telegram Error:",
          err.message
        );

      }

      res.json({
        success: true,
        message: "Deposit rejected successfully",
        deposit
      });

    } catch (error) {

      console.error(
        "REJECT ERROR:"
      );

      console.error(error);

      res.status(500).json({
        message: error.message,
        stack: error.stack
      });

    }

  }
);

router.post(
  "/bulk-approve",
  auth,
  roles("admin", "agent"),
  async (req, res) => {
    const session = await mongoose.startSession();
await session.startTransaction();

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


router.get(
  "/stats/summary",
  auth,
  roles("admin", "agent"),
  async (req, res) => {
    try {

      const { status = "all", processedBy = "all", startDate, endDate } = req.query;

      const filter = {};

if (status !== "all") {

  filter.status = status;

}
if (processedBy !== "all") {

  const processorRegex = new RegExp(
    `^${processedBy}$`,
    "i"
  );

  filter.$or = [
    {
      approvedByName: processorRegex
    },
    {
      rejectedByName: processorRegex
    }
  ];

}

if (startDate && endDate) {

  filter.createdAt = {

    $gte: new Date(startDate),

    $lte: new Date(
      new Date(endDate).setHours(
        23,
        59,
        59,
        999
      )
    )

  };

}

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const week = new Date(today);
      week.setDate(week.getDate() - 7);

      const month = new Date(today);
      month.setMonth(month.getMonth() - 1);

      const getStats = async (match) => {
        const result = await Deposit.aggregate([
          { $match: match },
          {
            $group: {
              _id: null,
              amount: { $sum: "$amount" },
              count: { $sum: 1 }
            }
          }
        ]);

        return {
          amount: result[0]?.amount || 0,
          count: result[0]?.count || 0
        };
      };

      const todayFilter = { ...filter };
const weekFilter = { ...filter };
const monthFilter = { ...filter };

if (!startDate || !endDate) {

  todayFilter.createdAt = {
    $gte: today
  };

  weekFilter.createdAt = {
    $gte: week
  };

  monthFilter.createdAt = {
    $gte: month
  };

}

const [
  todayStats,
  weekStats,
  monthStats,
  allStats,
  pendingStats,
  approvedStats,
  rejectedStats
] = await Promise.all([

  getStats({
    ...todayFilter,
    status:
  status === "all"
    ? "approved"
    : status
  }),

  getStats({
    ...weekFilter,
    status:
  status === "all"
    ? "approved"
    : status
  }),

  getStats({
    ...monthFilter,
    status:
  status === "all"
    ? "approved"
    : status
  }),

  getStats({
    ...filter,
    status:
  status === "all"
    ? "approved"
    : status
  }),

 getStats({
  ...filter,
  status: "pending"
}),

  getStats({
    ...filter,
    status:
  status === "all"
    ? "approved"
    : status
  }),

 getStats({
  ...filter,
  status:
    status === "all"
      ? "rejected"
      : status
})

]);

      let custom = null;

      if (startDate && endDate) {

       custom = await getStats({
  ...filter,
  createdAt: {
    $gte: new Date(startDate),
    $lte: new Date(
      new Date(endDate).setHours(
        23,
        59,
        59,
        999
      )
    )
  }
});
      }

      res.json({

        today: todayStats,

        week: weekStats,

        month: monthStats,

        all: allStats,

        pending: pendingStats,

        approved: approvedStats,

        rejected: rejectedStats,

        custom

      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error.message
      });

    }
  }
);

router.get(
  "/:id",
  auth,
  roles("admin", "agent"),
  async (req, res) => {

    try {

      const deposit = await Deposit.findById(req.params.id);

      if (!deposit) {
        return res.status(404).json({
          message: "Deposit not found"
        });
      }

      res.json(deposit);

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: "Server Error"
      });

    }

  }
);


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

module.exports = router;