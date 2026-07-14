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

    try {

      const {

        page = 1,

        limit = 20,

        status = "all",

        processedBy = "all",

        startDate,

        endDate,

        search

      } = req.query;

      let query = {};

      if (status !== "all") {

        query.status = status;

      }

      query.$and = [];

      // Processor filter

      if (processedBy !== "all") {

        const processorRegex = new RegExp(
          `^${processedBy}$`,
          "i"
        );

        query.$and.push({

          $or: [

            {
              approvedByName: processorRegex
            },

            {
              rejectedByName: processorRegex
            }

          ]

        });

      }

      // Search

      if (search) {

        query.$and.push({

          $or: [

            {

              username: {

                $regex: search,

                $options: "i"

              }

            },

            {

              accountNumber: {

                $regex: search,

                $options: "i"

              }

            },

            {

              withdrawalNumber: {

                $regex: search,

                $options: "i"

              }

            }

          ]

        });

      }

      if (query.$and.length === 0) {

        delete query.$and;
        console.log("QUERY =", query);

      }

      // Date Filter

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

      const skip =
        (Number(page) - 1) * Number(limit);

      const withdrawals =
        await Withdrawal.find(query)
          .sort({
            createdAt: -1
          })
          .skip(skip)
          .limit(Number(limit));
          console.log(
  "Statuses:",
  withdrawals.map(w => ({
    id: w._id,
    status: w.status
  }))
);

      const total =
        await Withdrawal.countDocuments(query);

      const pending =
        await Withdrawal.countDocuments({

          ...query,

          status: "pending"

        });

      const approved =
        await Withdrawal.countDocuments({

          ...query,

          status: "approved"

        });

      const rejected =
        await Withdrawal.countDocuments({

          ...query,

          status: "rejected"

        });

      const totalAmount =
        await Withdrawal.aggregate([

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

        withdrawals,

        stats: {

          total,

          pending,

          approved,

          rejected,

          totalAmount:
            totalAmount[0]?.total || 0

        },

        pagination: {

          currentPage:
            Number(page),

          totalPages:
            Math.ceil(
              total / Number(limit)
            ),

          totalItems:
            total,

          itemsPerPage:
            Number(limit)

        }

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
  "/processors",
  auth,
  roles("admin", "agent"),
  async (req, res) => {
    try {

      const admins = await User.find(
        { role: "admin" },
        "username role"
      ).sort({ username: 1 });

      const agents = await User.find(
        { role: "agent" },
        "username role"
      ).sort({ username: 1 });

      res.json({
        admins,
        agents
      });

    } catch (error) {

      console.error(error);

      res.status(500).json({
        message: error.message
      });

    }
  }
);

router.get(
  "/stats/summary",
  auth,
  roles("admin", "agent"),
  async (req, res) => {
    try {

      const {

    status = "all",

    processedBy = "all",

    startDate,

    endDate,

    search

} = req.query;
let baseQuery = {};

if (status !== "all") {

    baseQuery.status = status;

}

baseQuery.$and = [];
// Processor Filter
if (processedBy !== "all") {

  const processorRegex = new RegExp(
    `^${processedBy}$`,
    "i"
  );

  baseQuery.$and.push({
    $or: [
      { approvedByName: processorRegex },
      { rejectedByName: processorRegex }
    ]
  });

}
// Search Filter
if (search) {

  baseQuery.$and.push({

    $or: [

      {
        username: {
          $regex: search,
          $options: "i"
        }
      },

      {
        accountNumber: {
          $regex: search,
          $options: "i"
        }
      },

      {
        withdrawalNumber: {
          $regex: search,
          $options: "i"
        }
      }

    ]

  });

}
if (baseQuery.$and.length === 0) {
  delete baseQuery.$and;
}

      const now = new Date();

      // Today
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);

      // Week
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - 7);

      // Month
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      async function calculate(match = {}) {

        const result = await Withdrawal.aggregate([

          {
            $match: {

  ...baseQuery,

  ...match,

  status:
    status === "all"
      ? "approved"
      : status

}
          },

          {
            $group: {
              _id: null,
              amount: {
                $sum: "$amount"
              },
              count: {
                $sum: 1
              }
            }
          }

        ]);

        return {

          amount: result[0]?.amount || 0,

          count: result[0]?.count || 0

        };

      }

      const today = await calculate({
        createdAt: { $gte: todayStart }
      });

      const week = await calculate({
        createdAt: { $gte: weekStart }
      });

      const month = await calculate({
        createdAt: { $gte: monthStart }
      });

      const all = await calculate();
      const pending = {

  count: await Withdrawal.countDocuments({

    ...baseQuery,

    status: "pending"

  })

};

const approved = {

  count: await Withdrawal.countDocuments({

    ...baseQuery,

    status: "approved"

  })

};

const rejected = {

  count: await Withdrawal.countDocuments({

    ...baseQuery,

    status: "rejected"

  })

};

      let custom = null;

      if (startDate && endDate) {
        custom = await calculate({

    ...baseQuery,

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

        today,

        week,

        month,

        all,

        pending,

        approved,

        rejected,

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