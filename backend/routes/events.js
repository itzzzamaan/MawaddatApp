const express = require("express");
const router = express.Router();
const Event = require("../models/Event");
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const normalizeStoredImagePath = (value) => {
  if (!value || typeof value !== "string") return "";
  const normalized = value.replace(/\\/g, "/").replace(/\/+/g, "/").trim();
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) {
    const match = normalized.match(/(?:^|\/uploads\/)([^/?#]+\.(?:jpe?g|png|webp))$/i);
    return match ? `/uploads/${match[1]}` : "";
  }

  const filename = normalized.match(/(?:^|\/uploads\/)([^/?#]+\.(?:jpe?g|png|webp))$/i)?.[1] || normalized.split("/").filter(Boolean).pop();
  if (!filename || !/\.(jpe?g|png|webp)$/i.test(filename)) return "";
  return `/uploads/${filename}`;
};

const getImagePathFromBody = (body = {}) => {
  const value = body?.image || body?.avatar || "";
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return normalizeStoredImagePath(trimmed);
  if (trimmed.startsWith("/uploads/")) return trimmed;
  return "";
};

const applyStoredImageFields = (body = {}, file = null) => {
  const directImage = getImagePathFromBody(body);

  if (file && file.path) {
    const saved = normalizeStoredImagePath(file.path);
    if (saved) {
      body.image = saved;
      return body;
    }
  }

  if (directImage) {
    body.image = directImage;
  }

  return body;
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

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const mimeType = (file.mimetype || file.type || "").toLowerCase();
    const ext = path
      .extname(file.originalname || file.filename || "")
      .toLowerCase();

    const isAllowed =
      ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(
        mimeType,
      ) || [".jpg", ".jpeg", ".png", ".webp"].includes(ext);

    if (!isAllowed) {
      return cb(new Error("Only image files are allowed"));
    }

    cb(null, true);
  },
});

const normalizeEventBody = (body = {}) => {
  const normalized = { ...body };

  if (normalized.highlights && typeof normalized.highlights === "string") {
    normalized.highlights = normalized.highlights
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  if (normalized.featured === "true" || normalized.featured === "false") {
    normalized.featured = normalized.featured === "true";
  }

  if (
    normalized.category === "undefined" ||
    normalized.category === undefined
  ) {
    normalized.category = "Love";
  }

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

const serializeEvent = (item, req) => {
  if (!item) return item;
  const data = { ...item.toObject ? item.toObject() : item };
  data.image = normalizePublicImageUrl(normalizeStoredImagePath(data.image), req);
  return data;
};

// List
router.get("/", async (req, res) => {
  const items = await Event.find().sort({ createdAt: -1 });
  res.json(items.map((item) => serializeEvent(item, req)));
});

// Create
router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const body = normalizeEventBody(req.body || {});
    applyStoredImageFields(body, req.file);

    if (!body.image) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    body.image = normalizeStoredImagePath(body.image);
    if (!body.image) {
      return res.status(400).json({
        success: false,
        message: "Image file is required",
      });
    }

    const item = new Event(body);
    await item.save();

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: item,
    });
  } catch (err) {
    console.error("Create event error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create event",
      error: err.message,
    });
  }
});

// Get
router.get("/:id", async (req, res) => {
  const item = await Event.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Event not found" });
  res.json(serializeEvent(item, req));
});

// Update
router.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const body = normalizeEventBody(req.body || {});
    applyStoredImageFields(body, req.file);
    if (body.image) body.image = normalizeStoredImagePath(body.image);
    const item = await Event.findByIdAndUpdate(req.params.id, body, {
      new: true,
    });
    res.json(item);
  } catch (err) {
    console.error("Update event error:", err);
    res.status(500).json({ message: "Failed to update event" });
  }
});

// Delete
router.delete("/:id", auth, async (req, res) => {
  await Event.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
