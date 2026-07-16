const express = require("express");

const {
    getCatalog
} = require("../controllers/catalogController");

const router = express.Router();

router.get("/", getCatalog);

module.exports = router;