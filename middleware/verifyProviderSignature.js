const { createSignature } = require("../services/signatureService");

module.exports = (req, res, next) => {
  try {
    const providerSignature =
      req.headers["x-request-sign"] ||
      req.headers["X-REQUEST-SIGN"];

    if (!providerSignature) {
      return res.status(401).json({
        code: "INVALID_SIGNATURE",
        message: "Signature missing",
      });
    }

    const localSignature = createSignature(
      req.body,
      process.env.PROVIDER_SECRET_KEY
    );

    if (providerSignature !== localSignature) {
      return res.status(401).json({
        code: "INVALID_SIGNATURE",
        message: "Signature mismatch",
      });
    }

    next();
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      code: "SERVER_ERROR",
      message: "Signature verification failed",
    });
  }
};