const jwt = require("jsonwebtoken");
const User = require("../models/User");

module.exports = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("_id name email");
    if (!req.user) {
      return res.status(401).json({ message: "Invalid user" });
    }

    next(); // don’t override req or call next with args
  } catch (err) {
    console.error("Auth middleware failed:", err.message);
    res.status(401).json({ message: "Unauthorized" });
  }
};
