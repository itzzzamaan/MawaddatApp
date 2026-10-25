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
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized) && !normalized.includes("/uploads/")) return normalized;
  const match = normalized.match(/(?:^|.*?\/uploads\/)([^/?#]+)$/i);
  const filename = match ? match[1] : normalized.split("/").filter(Boolean).pop();
  if (!filename || filename === "uploads") return "";
  return `/uploads/${filename}`;
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

  const parsedLikes = Number(normalized.likes);
  normalized.likes = Number.isNaN(parsedLikes) ? 0 : parsedLikes;
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

const getImagePathFromBody = (body = {}) => {
  const value = body?.image || body?.avatar || "";
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/uploads/")) return trimmed;
  const match = trimmed.match(/(?:^|\/uploads\/)([^/?#]+\.(?:jpe?g|png|webp))$/i);
  if (match) return `/uploads/${match[1]}`;
  const filename = trimmed.split("/").filter(Boolean).pop();
  if (filename && /\.(jpe?g|png|webp)$/i.test(filename)) {
    return `/uploads/${filename}`;
  }
  return "";
};

const saveBase64Image = (rawString) => {
  if (!rawString || typeof rawString !== "string") return "";
  if (!rawString.startsWith("data:image/") && rawString.length < 500) return "";
  try {
    const mimeMatch = rawString.match(/^data:image\/([a-zA-Z0-9.+-]+);base64,/);
    const cleanBase64 = rawString.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    if (buffer.length === 0) return "";
    const ext = mimeMatch && mimeMatch[1] ? `.${mimeMatch[1].replace("jpeg", "jpg")}` : ".jpg";
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-upload${ext}`;
    const uploadDir = path.resolve(__dirname, "..", process.env.UPLOAD_DIR || "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(path.join(uploadDir, filename), buffer);
    return `/uploads/${filename}`;
  } catch (e) {
    return "";
  }
};

const applyStoredImageFields = (body = {}, files = {}) => {
  const file =
    (files.image && files.image[0]) || (files.avatar && files.avatar[0]);

  if (file) {
    const saved = `/uploads/${file.filename}`;
    body.image = saved;
    body.avatar = saved;
    return body;
  }

  // Support base64 string directly in text body
  const rawImage = body?.image || body?.avatar || body?.imageBase64 || "";
  if (typeof rawImage === "string" && (rawImage.startsWith("data:image/") || rawImage.length > 500)) {
    const savedFromBase64 = saveBase64Image(rawImage);
    if (savedFromBase64) {
      body.image = savedFromBase64;
      body.avatar = savedFromBase64;
      return body;
    }
  }

  const directImage = getImagePathFromBody(body);
  if (directImage) {
    body.image = directImage;
    body.avatar =
      body.avatar &&
      typeof body.avatar === "string" &&
      body.avatar.trim().startsWith("/uploads/")
        ? body.avatar.trim()
        : directImage;
  }

  return body;
};

router.post("/", auth, (req, res) => {
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "avatar", maxCount: 1 },
  ])(req, res, async (err) => {
    if (err) {
      console.error("Multer error in homefeeds POST:", err);
      return res.status(400).json({ message: err.message });
    }

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
        ...serializeHomeFeed(item, req),
        comments: normalizeCommentList(item.comments)
          .map(normalizeStoredComment)
          .filter(Boolean),
      });
    } catch (createErr) {
      console.error("Create homefeed error:", createErr);
      res.status(500).json({ message: "Failed to create home feed" });
    }
  });
});

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

router.put("/:id", auth, (req, res) => {
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "avatar", maxCount: 1 },
  ])(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

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
      if (!item) {
        return res.status(404).json({ message: "Home feed not found" });
      }
      res.json({
        ...serializeHomeFeed(item, req),
        comments: normalizeCommentList(item.comments)
          .map(normalizeStoredComment)
          .filter(Boolean),
      });
    } catch (updateErr) {
      console.error("Update homefeed error:", updateErr);
      res.status(500).json({ message: "Failed to update home feed" });
    }
  });
});

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

