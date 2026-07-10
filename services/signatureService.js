const crypto = require("crypto");

function createSignature(body, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(body))
    .digest("hex")
    .toUpperCase();
}

module.exports = {
  createSignature,
};