const express = require("express");

const router = express.Router();

const {
    importGames
} = require("../controllers/gameImportController");

router.post(
    "/",
    importGames
);

module.exports = router;