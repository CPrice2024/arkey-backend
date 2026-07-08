const auth =
require("../middleware/auth");
const bcrypt = require("bcryptjs");

const roles =
require("../middleware/roles");
const express = require("express");
console.log("🔥 USER ROUTES FILE LOADED");

const router = express.Router();

router.get("/debug", (req, res) => {
  res.json({
    success: true,
    message: "User routes loaded"
  });
});

router.get("/admin-test", (req, res) => {
  console.log("ADMIN TEST HIT");
  res.json({
    success: true
  });
});

const User = require("../models/User");



const fs = require("fs");
const csv = require("csv-parser");

const upload =
  require("../middleware/upload");



router.get(
  "/",
  auth,
  roles("admin"),
  async (req,res)=>{

  try {

    const query = {};

if (req.query.role) {
  query.role = req.query.role;
}

const users =
await User.find(query)
.sort({
  createdAt: -1
});

    res.json({
      users,
      total: users.length
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Failed to fetch users"
    });
  }
});

router.post(
  "/migrate-roles",
  auth,
  roles("admin"),
  async (req, res) => {

    const result =
      await User.updateMany(
        { role: "user" },
        { role: "player" }
      );

    res.json(result);

  }
);

router.post(
  "/",
  auth,
  roles("admin"),
  async (req,res)=>{

  try {

let {
  telegramId,
  username,
  firstName,
  lastName,
  phone,
  email,
  password,
  role,
  balance,
  status
} = req.body;

    if (
      !telegramId?.trim() ||
      !username?.trim()
    ) {

      return res.status(400).json({

        message:
          "telegramId and username are required"
      });
    }

    telegramId =
      telegramId.trim();

    username =
      username.trim();


    const existingUser =
      await User.findOne({

        $or: [

          { telegramId },

          { username }
        ]
      });

    if (existingUser) {

      return res.status(400).json({

        message:
          "User already exists"
      });
    }

  let hashedPassword = "";

if (
  ["admin", "agent"].includes(role)
) {

  if (!email || !password) {

    return res.status(400).json({
      message:
        "Email and password required"
    });

  }

  hashedPassword =
    await bcrypt.hash(
      password,
      10
    );
}

const userData = {

  telegramId,

  username,

  firstName:
    firstName?.trim() || "",

  lastName:
    lastName?.trim() || "",

  phone:
    phone?.trim() || "",

  role:
    role || "player",

  balance:
    Number(balance) || 0,

  isActive:
    status === "active"
};

if (
  ["admin", "agent"].includes(role)
) {

  userData.email =
    email?.trim();

  userData.password =
    hashedPassword;
}

console.log("USER DATA =", userData);

const user =
  await User.create(
    userData
  );

    res.status(201).json({

      success: true,

      user
    });

  } catch (error) {

    console.log(
      "CREATE USER ERROR:"
    );

    console.log(error);

    res.status(500).json({

      message:
        error.message
    });
  }
});

router.get(
  "/telegram/:telegramId",
  async (req, res) => {

    try {

      const user =
        await User.findOne({
          telegramId:
            req.params.telegramId
        });

      if (!user) {

        return res.status(404).json({
          message: "User not found"
        });
      }

      res.json({ user });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message:
          "Failed to fetch user"
      });
    }
  }
);

router.post(
  "/bulk-upload",
  auth,
  roles("admin"),
  upload.single("file"),

  async (req, res) => {

    try {

      if (!req.file) {

        return res.status(400).json({
          message: "CSV file required"
        });
      }

      const users = [];

      fs.createReadStream(
        req.file.path
      )

      .pipe(csv())

      .on("data", (row) => {

users.push({

  telegramId:
    row.telegramId || "",

  username:
    row.username || "",

  firstName:
    row.firstName || "",

  lastName:
    row.lastName || "",

  phone:
    row.phone || "",

  role:
    row.role || "player",

  balance:
    Number(row.balance) || 0,

  isActive:
    row.status !== "inactive"
});
      })

      .on("end", async () => {

        try {

          let insertedCount = 0;

          for (const user of users) {


            if (
              !user.telegramId ||
              !user.username
            ) {
              continue;
            }

            const existingUser =
              await User.findOne({
                telegramId:
                  user.telegramId
              });

            if (existingUser) {
              continue;
            }

            await User.create(user);

            insertedCount++;
          }


          if (fs.existsSync(req.file.path)) {
  fs.unlinkSync(req.file.path);
}

          res.json({

            success: true,

            message:
              "Bulk upload completed",

            inserted:
              insertedCount
          });

        } catch (error) {

          console.log(
  error.message
);

          res.status(500).json({

            message:
              "Bulk insert failed"
          });
        }
      });

    } catch (error) {

      console.log(
  error.message
);

      res.status(500).json({

        message:
          "Bulk upload failed"
      });
    }
  }
);
router.put(
  "/:id",
  auth,
  roles("admin"),
  async (req,res)=>{

  try {

    const updatedUser =
      await User.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

    if (!updatedUser) {

      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      user: updatedUser
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Failed to update user"
    });
  }
});

router.delete(
  "/:id",
  auth,
  roles("admin"),
  async (req,res)=>{

  try {

    const deletedUser =
      await User.findByIdAndDelete(
        req.params.id
      );

    if (!deletedUser) {

      return res.status(404).json({
        message: "User not found"
      });
    }

    res.json({
      message: "User deleted successfully"
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Failed to delete user"
    });
  }
});

router.patch(
  "/:id/status",
  auth,
  roles("admin"),
  async (req, res) => {

    try {

      const updatedUser =
        await User.findByIdAndUpdate(
          req.params.id,
          {
            isActive:
              req.body.status === "active"
          },
          {
            new: true
          }
        );

      if (!updatedUser) {
        return res.status(404).json({
          message: "User not found"
        });
      }

      res.json({
        success: true,
        user: updatedUser
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error.message
      });

    }

  }
);
router.post(
  "/bulk-update-balance",
  auth,
  roles("admin"),
  async (req, res) => {

    try {

      const amount =
        Number(req.body.amount);

      await User.updateMany(
        {},
        {
          $inc: {
            balance: amount
          }
        }
      );

      res.json({
        message:
          "Balances updated successfully"
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message:
          "Failed to update balances"
      });
    }
  }
);


router.post(
  "/agent",
  auth,
  roles("admin"),

  async (req, res) => {

    console.log("BODY:", req.body);

    try {

      const existingAgent =
        await User.findOne({
          email: req.body.email
        });

      if (existingAgent) {

        return res.status(400).json({
          message: "Agent already exists"
        });

      }

      const hashedPassword =
        await bcrypt.hash(
          req.body.password,
          10
        );

      const agent =
        await User.create({

          telegramId: req.body.telegramId,

          username: req.body.username,

          firstName: req.body.firstName,

          phone: req.body.phone,

          email: req.body.email,

          password: hashedPassword,

          role: "agent",

          balance: 0,

          isActive: true

        });

      res.status(201).json({
        success: true,
        user: agent
      });

    } catch (error) {

      res.status(500).json({
        message: error.message
      });

    }

  }
);




router.post("/admin", async (req, res) => {

  console.log("🔥 ADMIN ROUTE HIT");

  try {

    const hashedPassword =
      await bcrypt.hash(
        req.body.password,
        10
      );

    const admin =
      await User.create({

        telegramId: req.body.telegramId,
        username: req.body.username,
        firstName: req.body.firstName,
        phone: req.body.phone,

        email: req.body.email,

        password: hashedPassword,

        role: "admin",

        balance: 0
      });

    res.status(201).json({
      success: true,
      user: admin
    });

  } catch (error) {

    res.status(500).json({
      message: error.message
    });

  }

});


router.get(
  "/stats",
  async (req, res) => {

    try {

      const totalPlayers =
        await User.countDocuments({
          role: "player"
        });

      const totalAgents =
        await User.countDocuments({
          role: "agent"
        });

      const totalAdmins =
        await User.countDocuments({
          role: "admin"
        });

      const totalBalance =
        await User.aggregate([
          {
            $group: {
              _id: null,
              total: {
                $sum: "$balance"
              }
            }
          }
        ]);

      res.json({
        totalPlayers,
        totalAgents,
        totalAdmins,
        totalBalance:
          totalBalance[0]?.total || 0
      });

    } catch (error) {

      res.status(500).json({
        message: error.message
      });

    }

  }
);

router.get(
  "/agents",
  auth,
  roles("admin"),
  async (req,res)=>{

    const agents =
    await User.find({
      role: "agent"
    });

    res.json({
      agents
    });

  }
);


router.get(
  "/players",
  auth,
  roles("admin","agent"),
  async (req,res)=>{

    const players =
    await User.find({
      role: "player"
    });

    res.json({
      players
    });

  }
);



router.get(
  "/me",
  auth,
  async (req, res) => {

    try {

      const user =
      await User.findById(
        req.user._id
      );

      if (!user) {

        return res.status(404)
        .json({
          message: "User not found"
        });

      }

      res.json({
        user
      });

    } catch (error) {

      res.status(500).json({
        message: error.message
      });

    }

  }
);
router.get("/admin-test", (req, res) => {
  res.json({
    success: true,
    message: "ADMIN TEST WORKS"
  });
});

router.post(
  "/player",
  auth,
  roles("admin"),

  async (req, res) => {

    try {

      const player =
        await User.create({

          telegramId: req.body.telegramId,

          username: req.body.username,

          firstName: req.body.firstName || "",

          phone: req.body.phone || "",

          role: "player",

          balance: req.body.balance || 0,

          isActive: true

        });

      res.status(201).json({
        success: true,
        user: player
      });

    } catch (error) {

      res.status(500).json({
        message: error.message
      });

    }

  }
);

module.exports = router;