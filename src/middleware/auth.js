const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.header("Authorization");
    const token = authHeader?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        code: "NO_TOKEN",
        message: "No token provided",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("_id name email");
    if (!user) {
      return res.status(401).json({
        code: "INVALID_USER",
        message: "Invalid user",
      });
    }

    req.user = user;
    next();
  } catch (err) {
    // JWT expired case
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        code: "TOKEN_EXPIRED",
        message: "Session expired. Please login again.",
      });
    }

    // other JWT errors
    return res.status(401).json({
      code: "UNAUTHORIZED",
      message: "Unauthorized",
    });
  }
};
