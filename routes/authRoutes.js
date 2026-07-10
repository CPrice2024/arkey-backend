require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");

const router = express.Router();

router.post(
  "/login",
  async (req, res) => {
    try {

      const {
        email,
        password
      } = req.body;

      const user =
        await User.findOne({ email });

      if (!user) {
        return res.status(401).json({
          message: "Invalid credentials"
        });
      }

      const match =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!match) {
        return res.status(401).json({
          message: "Invalid credentials"
        });
      }

      const token = jwt.sign(
        {
          _id: user._id,
          role: user.role,
          username: user.username
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d"
        }
      );

      res.json({
        success: true,
        token,
        role: user.role,
        user
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
  "/player-test-token",
  async (req, res) => {

    const user =
      await User.findOne({
        username:
          req.body.username
      });

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const token =
      jwt.sign(
        {
          _id: user._id,
          role: user.role,
          username: user.username
        },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d"
        }
      );

    res.json({
      token,
      user
    });
  }
);

router.post(
  "/telegram-login",
  async (req, res) => {
    console.log("LOGIN SECRET:", process.env.JWT_SECRET);
    

    try {

      const { telegramId } =
        req.body;

      const user =
        await User.findOne({
          telegramId:
            String(telegramId)
        });

      if (!user) {
        return res.status(404).json({
          message:
            "Player not found"
        });
      }

      const token =
        jwt.sign(
          {
            _id: user._id,
            role: user.role,
            username: user.username
          },
          process.env.JWT_SECRET,
          {
            expiresIn: "7d"
          }
        );

      res.json({
        success: true,
        token,
        user
      });

    } catch (error) {

      console.log(error);

      res.status(500).json({
        message: error.message
      });

    }

  }
);

module.exports = router;