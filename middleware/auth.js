const jwt =
require("jsonwebtoken");

module.exports =
(req, res, next) => {
  console.log("VERIFY SECRET:", process.env.JWT_SECRET);

  try {

    const token =
    req.headers.authorization
    ?.split(" ")[1];

    if (!token) {
      return res
      .status(401)
      .json({
        message:
        "No token"
      });
    }

    const decoded =
    jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();

  } catch (err) {

  console.log("JWT ERROR:");
  console.log(err);

  return res.status(401).json({
    message: err.message
  });

}

};
