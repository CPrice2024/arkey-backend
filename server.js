console.log("🔥 BACKEND SERVER.JS LOADED");
require("dotenv").config();

const userRoutes =
  require("./routes/userRoutes");
  console.log("USER ROUTES:", typeof userRoutes);

  const gameAuthRoutes =
require("./routes/gameAuthRoutes");

const inoutRoutes = require("./routes/inoutRoutes");

const authRoutes =
  require("./routes/authRoutes");

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");
const jwt = require("jsonwebtoken");

const depositRoutes =
  require("./routes/depositRoutes");

const withdrawalRoutes =
  require("./routes/withdrawalRoutes");

const User =
  require("./models/User");

const gameRoutes =
  require("./routes/gameRoutes");  


const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://arkey-frontend.vercel.app",
  "https://arkey-frontend-g934.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());


app.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "SERVER WORKING"
  });
});

app.use(
  "/api/users",
  userRoutes
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/deposits",
  depositRoutes
);

app.use(
  "/api/withdrawals",
  withdrawalRoutes
);


app.use("/api/inout", inoutRoutes);

app.use(
  "/api/game", 
  gameRoutes
);

app.use(
"/api/game",
gameAuthRoutes
);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {

    console.log(
      "✅ MongoDB Connected"
    );

    // TEMPORARY
// global.bot = require("./bot/telegramBot");

console.log("🤖 Telegram bot disabled for API testing");

      const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on ${PORT}`);
});

  })
  .catch((err) => {

    console.log(
      "MongoDB Error:"
    );

    console.log(err);

  });


const storage =
  multer.diskStorage({

    destination: (
      req,
      file,
      cb
    ) => {

      cb(
        null,
        "uploads/"
      );
    },

    filename: (
      req,
      file,
      cb
    ) => {

      cb(
        null,
        Date.now() +
        path.extname(
          file.originalname
        )
      );
    }
  });

const upload =
  multer({ storage });


app.get(
  "/telegram-login",
  async (req, res) => {

    try {

      const { token } = req.query;

      const decoded =
        jwt.verify(
          token,
          process.env.JWT_SECRET
        );

      const user =
        await User.findOne({
          telegramId:
            decoded.telegramId
        });

      if (!user) {
        return res
          .status(401)
          .send("User not found");
      }

      return res.redirect(
        `https://www.arkey.bet/virtual-casino?telegramId=${user.telegramId}`
      );

    } catch (err) {

      console.log(err);

      return res
        .status(401)
        .send("Invalid token");
    }
});


app.post(
  "/api/users/bulk-upload",
  upload.single("file"),

  async (req, res) => {

    try {

      console.log("UPLOAD STARTED");

      if (!req.file) {

        return res.status(400).json({
          success: false,
          message: "No CSV file uploaded"
        });
      }

      console.log(req.file);

      const users = [];

      fs.createReadStream(req.file.path)

        .pipe(csv())

        .on("data", (row) => {

          console.log("CSV ROW:", row);

          users.push({

            telegramId:
              String(row.telegramId || "").trim(),

            username:
              String(row.username || "").trim(),

            firstName:
              String(row.firstName || "").trim(),

            lastName:
              String(row.lastName || "").trim(),

            phone:
              String(row.phone || "").trim(),

            role:
              String(row.role || "user").trim(),

            balance:
              Number(row.balance || 0),

            isActive:
              row.status !== "inactive"
          });
        })

        .on("end", async () => {

          try {

            console.log("TOTAL CSV USERS:", users.length);

            let insertedCount = 0;

            for (const user of users) {

              if (
                !user.telegramId ||
                !user.username
              ) {

                console.log(
                  "SKIPPED EMPTY USER"
                );

                continue;
              }

              const existingUser =
                await User.findOne({
                  telegramId:
                    user.telegramId
                });

              if (existingUser) {

                console.log(
                  "DUPLICATE:",
                  user.telegramId
                );

                continue;
              }

              await User.create(user);

              insertedCount++;

              console.log(
                "INSERTED:",
                user.username
              );
            }

            // DELETE FILE

            if (
              fs.existsSync(req.file.path)
            ) {

              fs.unlinkSync(
                req.file.path
              );
            }

            return res.json({

              success: true,

              message:
                "CSV uploaded successfully",

              inserted:
                insertedCount
            });

          } catch (error) {

            console.log(
              "INSERT ERROR:"
            );

            console.log(error);

            return res.status(500).json({

              success: false,

              message:
                error.message
            });
          }
        });

    } catch (error) {

      console.log(
        "UPLOAD ERROR:"
      );

      console.log(error);

      return res.status(500).json({

        success: false,

        message:
          error.message
      });
    }
  }
);


app.post(
  "/broadcast-media",
  upload.single("media"),
  async (req, res) => {
    try {

      const { message } = req.body;

      console.log("MESSAGE:", message);

      const users = await User.find();

      console.log("TOTAL USERS:", users.length);

      for (const user of users) {

        console.log(
          "SENDING TO:",
          user.telegramId
        );

        try {

          await global.bot.telegram.sendMessage(
            user.telegramId,
            message
          );

          console.log(
            "SUCCESS:",
            user.telegramId
          );

        } catch (err) {

          console.log(
            "FAILED:",
            user.telegramId
          );

          console.log(err.message);
        }
      }

      res.json({
        success: true
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        success: false
      });
    }
  } 
);


