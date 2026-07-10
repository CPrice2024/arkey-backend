const express = require("express");
const verifySignature = require("../middleware/verifyProviderSignature");
const { callback } = require("../controllers/inoutController");

const router = express.Router();

/*
 * Test signature
 */
router.post(
  "/test-signature",
  verifySignature,
  (req, res) => {
    res.json({
      code: "OK",
      message: "Signature verified",
    });
  }
);

/*
 * Main callback from InOut provider
 */
router.post(
  "/gamesprovider",
  // verifySignature, // Enable after testing
  callback
);

module.exports = router;