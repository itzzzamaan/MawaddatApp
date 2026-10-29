const express = require("express");
const mongoose = require("mongoose");
const Notification = require("../models/Notification");
const User = require("../models/User");
const userAuth = require("../middleware/userAuth");

const router = express.Router();

router.get("/", userAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    return res.json(notifications);
  } catch (error) {
    console.error("List notifications error:", error);
    return res.status(500).json({ message: "Failed to load notifications" });
  }
});

router.get("/unread-count", userAuth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      userId: req.user.id,
      read: false,
    });
    return res.json({ count });
  } catch (error) {
    console.error("Count unread notifications error:", error);
    return res.status(500).json({ message: "Failed to count notifications" });
  }
});

router.put("/followed-poets", userAuth, async (req, res) => {
  const followedPoets = req.body?.followedPoets;
  if (!Array.isArray(followedPoets) || followedPoets.length > 500) {
    return res.status(400).json({ message: "Invalid followed poets list" });
  }

  const normalized = followedPoets
    .filter((poet) => poet && typeof poet === "object")
    .map((poet) => ({
      id: String(poet.id || "").trim(),
      name: String(poet.name || "").trim(),
    }))
    .filter((poet) => poet.id || poet.name);

  try {
    await User.updateOne(
      { _id: req.user.id },
      { $set: { followedPoets: normalized } },
    );
    return res.json({ success: true });
  } catch (error) {
    console.error("Sync followed poets error:", error);
    return res.status(500).json({ message: "Failed to sync followed poets" });
  }
});

router.put("/device", userAuth, async (req, res) => {
  const token = req.body?.token;
  if (typeof token !== "string" || token.length < 20 || token.length > 4096) {
    return res.status(400).json({ message: "A valid device token is required" });
  }

  try {
    await User.updateOne(
      { _id: req.user.id },
      { $addToSet: { pushTokens: token } },
    );
    return res.json({ success: true });
  } catch (error) {
    console.error("Register notification device error:", error);
    return res.status(500).json({ message: "Failed to register device" });
  }
});

router.delete("/device", userAuth, async (req, res) => {
  const token = req.body?.token;
  if (typeof token !== "string" || token.length < 20 || token.length > 4096) {
    return res.status(400).json({ message: "A valid device token is required" });
  }

  try {
    await User.updateOne(
      { _id: req.user.id },
      { $pull: { pushTokens: token } },
    );
    return res.json({ success: true });
  } catch (error) {
    console.error("Unregister notification device error:", error);
    return res.status(500).json({ message: "Failed to unregister device" });
  }
});

router.patch("/read-all", userAuth, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { userId: req.user.id, read: false },
      { $set: { read: true } },
    );
    return res.json({ success: true, updated: result.modifiedCount });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return res.status(500).json({ message: "Failed to update notifications" });
  }
});

router.patch("/:id/read", userAuth, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Invalid notification ID" });
  }

  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { read: true } },
      { new: true },
    ).lean();
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    return res.json(notification);
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ message: "Failed to update notification" });
  }
});

module.exports = router;
