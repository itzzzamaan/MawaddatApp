module.exports = function adminOnly(req, res, next) {
  if (req.admin?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  return next();
};
