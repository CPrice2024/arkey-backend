const express = require("express");

const router = express.Router();

const {
getGames
}
=
require("../controllers/gameCatalogController");

router.get(
"/",
getGames
);

module.exports=router;