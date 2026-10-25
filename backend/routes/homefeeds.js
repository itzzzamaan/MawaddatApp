const express = require("express");
const router = express.Router();
const HomeFeed = require("../models/HomeFeed");
const auth = require("../middleware/auth");
const multer = require("multer");
const fs = require("fs");
const path = require("path");

const normalizeStoredImagePath = (value) => {
  if (!value || typeof value !== "string") return "";
  const normalized = value.replace(/\\/g, "/").replace(/\/+/g, "/").trim();
  if (!normalized || /^https?:\/\//i.test(normalized)) return normalized;
  const cleaned = normalized
    .replace(/^\/+/, "")
    .replace(/^.*?(?:uploads\/)?/, "");
  return `/${(process.env.UPLOAD_DIR || "uploads").replace(/\\/g, "/").replace(/^\//, "")}/${cleaned}`;
};

// const upload = multer({ dest: process.env.UPLOAD_DIR || 'uploads/' });

const UPLOAD_DIR = path.resolve(
  __dirname,
  "..",
  process.env.UPLOAD_DIR || "uploads",
);

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    cb(null, filename);
  },
});

const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const hasAllowedImageType = (file) => {
  const mimeType = (file && (file.mimetype || file.type || "")).toLowerCase();
  const ext = path
    .extname(file?.originalname || file?.filename || "")
    .toLowerCase();

  return (
    allowedMimeTypes.includes(mimeType) ||
    [".jpg", ".jpeg", ".png", ".webp"].includes(ext)
  );
};

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (!hasAllowedImageType(file)) {
      return cb(new Error("Only JPG, PNG and WEBP images are allowed"));
    }

    cb(null, true);
  },
});

const normalizeStoredComment = (comment = {}) => {
  if (!comment || typeof comment !== "object") return null;

  return {
    id: String(comment._id || comment.id || `${Date.now()}-${Math.random()}`),
    text: comment.text || "",
    userId: comment.userId || "",
    userName: comment.userName || "User",
    userAvatar: comment.userAvatar || "",
    createdAt: comment.createdAt || new Date().toISOString(),
  };
};

const normalizeCommentList = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  return [];
};

const normalizeHomeFeedBody = (body = {}) => {
  const normalized = { ...body };

  if (typeof normalized.content === "string") {
    try {
      normalized.content = JSON.parse(normalized.content);
    } catch (err) {
      normalized.content = { roman: normalized.content };
    }
  }

  if (normalized.content && typeof normalized.content === "object") {
    const next = normalized.content;
    normalized.content = {
      roman: next.roman || next.text || "",
      urdu: next.urdu || "",
      hindi: next.hindi || "",
    };
  }

  if (
    normalized.likes === undefined ||
    normalized.likes === null ||
    normalized.likes === ""
  )
    normalized.likes = 0;
  if (
    normalized.comments === undefined ||
    normalized.comments === null ||
    normalized.comments === ""
  )
    normalized.comments = [];
  if (
    typeof normalized.comments !== "undefined" &&
    !Array.isArray(normalized.comments)
  )
    normalized.comments = [];
  if (normalized.liked === "true" || normalized.liked === "false")
    normalized.liked = normalized.liked === "true";
  if (normalized.following === "true" || normalized.following === "false")
    normalized.following = normalized.following === "true";
  if (normalized.saved === "true" || normalized.saved === "false")
    normalized.saved = normalized.saved === "true";

  if (normalized.poetName && !normalized.poet)
    normalized.poet = normalized.poetName;

  return normalized;
};

const getSafeImageFilename = (value) => {
  if (!value || typeof value !== "string") return "";
  const normalized = value.replace(/\\/g, "/").replace(/\/+/g, "/").trim();
  const pathPart = normalized.includes("/uploads/") ? normalized.split("/uploads/").pop() : normalized;
  const filename = pathPart.split("/").filter(Boolean).pop();
  return filename && /\.(jpe?g|png|webp)$/i.test(filename) ? filename : "";
};

const normalizePublicImageUrl = (value, req) => {
  if (!value || typeof value !== "string") return value;
  if (/^https?:\/\//i.test(value)) return value;

  const filename = getSafeImageFilename(value);
  if (!filename) return value;

  const base = `${req.protocol}://${req.get("host")}`;
  return `${base}/uploads/${filename}`;
};

const serializeHomeFeed = (item, req) => {
  if (!item) return item;
  const data = { ...item.toObject ? item.toObject() : item };
  if (data.image) data.image = normalizePublicImageUrl(data.image, req);
  if (data.avatar) data.avatar = normalizePublicImageUrl(data.avatar, req);
  return data;
};

router.get("/", async (req, res) => {
  const items = await HomeFeed.find().sort({ createdAt: -1 });
  const serialized = items.map((item) => serializeHomeFeed(item, req));
  res.json(
    serialized.map((item) => ({
      ...item,
      comments: normalizeCommentList(item.comments)
        .map(normalizeStoredComment)
        .filter(Boolean),
    })),
  );
});

router.post(
  "/",
  auth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "avatar", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      let body = normalizeHomeFeedBody(req.body || {});
      body = applyStoredImageFields(body, req.files || {});

      if (!body.image && !body.avatar) {
        return res.status(400).json({ message: "Image is required" });
      }

      body.image = body.image || body.avatar;
      body.avatar = body.avatar || body.image;

      const item = new HomeFeed(body);
      await item.save();
      res.json({
        ...item.toObject(),
        comments: normalizeCommentList(item.comments)
          .map(normalizeStoredComment)
          .filter(Boolean),
      });
    } catch (err) {
      console.error("Create homefeed error:", err);
      res.status(500).json({ message: "Failed to create home feed" });
    }
  },
);

router.get("/:id", async (req, res) => {
  const item = await HomeFeed.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Home feed not found" });
  res.json({
    ...serializeHomeFeed(item, req),
    comments: normalizeCommentList(item.comments)
      .map(normalizeStoredComment)
      .filter(Boolean),
  });
});

router.put(
  "/:id",
  auth,
  upload.fields([{ name: "image" }, { name: "avatar" }]),
  async (req, res) => {
    try {
      let body = normalizeHomeFeedBody(req.body || {});
      body = applyStoredImageFields(body, req.files || {});

      if (!body.image && !body.avatar) {
        return res.status(400).json({ message: "Image is required" });
      }

      body.image = body.image || body.avatar;
      body.avatar = body.avatar || body.image;

      const item = await HomeFeed.findByIdAndUpdate(req.params.id, body, {
        new: true,
      });
      if (!item)
        return res.status(404).json({ message: "Home feed not found" });
      res.json({
        ...item.toObject(),
        comments: normalizeCommentList(item.comments)
          .map(normalizeStoredComment)
          .filter(Boolean),
      });
    } catch (err) {
      console.error("Update homefeed error:", err);
      res.status(500).json({ message: "Failed to update home feed" });
    }
  },
);

router.delete("/:id", auth, async (req, res) => {
  await HomeFeed.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

router.post("/:id/comments", auth, async (req, res) => {
  try {
    const { text, userId, userName, userAvatar } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ message: "Comment text is required." });
    }

    const feed = await HomeFeed.findById(req.params.id);
    if (!feed) {
      return res.status(404).json({ message: "Post not found." });
    }

    const currentComments = normalizeCommentList(feed.comments);
    const comment = {
      text: String(text).trim(),
      userId: userId || "",
      userName: userName || "User",
      userAvatar: userAvatar || "",
      createdAt: new Date(),
    };

    feed.comments = [...currentComments, comment];
    await feed.save();

    res.status(201).json({
      success: true,
      comment: normalizeStoredComment(comment),
      comments: normalizeCommentList(feed.comments)
        .map(normalizeStoredComment)
        .filter(Boolean),
    });
  } catch (err) {
    console.error("Add homefeed comment error:", err);
    res.status(500).json({ message: "Failed to add comment" });
  }
});

module.exports = router;

const getImagePathFromBody = (body = {}) => {
  const value = body?.image || body?.avatar || "";
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/uploads/")) return trimmed;
  return "";
};

const applyStoredImageFields = (body = {}, files = {}) => {
  const directImage = getImagePathFromBody(body);
  const file =
    (files.image && files.image[0]) || (files.avatar && files.avatar[0]);

  if (file) {
    const saved = `/uploads/${file.filename}`;
    body.image = saved;
    body.avatar = saved;
    return body;
  }

  if (directImage) {
    body.image = directImage;
    body.avatar = body.avatar && typeof body.avatar === "string" && body.avatar.trim().startsWith("/uploads/") ? body.avatar.trim() : directImage;
  }

  return body;
};
