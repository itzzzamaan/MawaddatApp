const jwt = require("jsonwebtoken");

module.exports = function userAuth(req, res, next) {
  const authorization = req.headers.authorization || "";
  const token = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "change_this_secret",
    );
    if (payload.role !== "user" || !payload.id) {
      return res.status(403).json({ message: "User access required" });
    }

    req.user = payload;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
