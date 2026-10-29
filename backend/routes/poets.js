const express = require("express");
const router = express.Router();
const Poet = require("../models/Poet");
const auth = require("../middleware/auth");
const { saveImageAsset } = require("../database");
const multer = require("multer");
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

const upload = multer({
  storage: multer.memoryStorage(),
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

const normalizePoetBody = (body = {}) => {
  const normalized = { ...body };
  if (!normalized.description && normalized.bio)
    normalized.description = normalized.bio;
  if (!normalized.bio && normalized.description)
    normalized.bio = normalized.description;
  if (normalized.categories && typeof normalized.categories === "string") {
    normalized.categories = normalized.categories
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (normalized.social && typeof normalized.social === "string") {
    try {
      normalized.social = JSON.parse(normalized.social);
    } catch (err) {
      normalized.social = {};
    }
  }
  if (
    normalized.avatar &&
    typeof normalized.avatar === "string" &&
    normalized.avatar.startsWith("http")
  ) {
    normalized.image = normalized.avatar;
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

const serializePoet = (item, req) => {
  if (!item) return item;
  const data = { ...item.toObject ? item.toObject() : item };
  if (data.avatar) data.avatar = normalizePublicImageUrl(data.avatar, req);
  if (data.image) data.image = normalizePublicImageUrl(data.image, req);
  return data;
};

router.get("/", async (req, res) => {
  const items = await Poet.find().sort({ createdAt: -1 });
  res.json(items.map((item) => serializePoet(item, req)));
});

// router.post("/", auth, upload.single("image"), async (req, res) => {
//   try {
//     const body = normalizePoetBody(req.body || {});
//     if (req.file) {
//       const filePath =
//         "/" + (process.env.UPLOAD_DIR || "uploads") + "/" + req.file.filename;
//       body.avatar = filePath;
//       body.image = filePath;
//     }
//     const item = new Poet(body);
//     await item.save();
//     res.json(item);
//   } catch (err) {
//     console.error("Create poet error:", err);
//     res.status(500).json({ message: "Failed to create poet" });
//   }
// });

router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    const body = normalizePoetBody(req.body || {});

    if (req.file?.buffer) {
      const saved = await saveImageAsset(req.file.buffer, req.file.mimetype);
      body.avatar = saved.path;
      body.image = saved.path;
    }

    const item = new Poet(body);
    await item.save();

    return res.status(201).json({
      success: true,
      message: "Poet created successfully",
      data: item,
    });
  } catch (err) {
    console.error("Create poet error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create poet",
      error: err.message,
    });
  }
});

router.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const body = normalizePoetBody(req.body || {});

    if (req.file?.buffer) {
      const saved = await saveImageAsset(req.file.buffer, req.file.mimetype);
      body.avatar = saved.path;
      body.image = saved.path;
    }

    const item = await Poet.findByIdAndUpdate(req.params.id, body, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Poet not found",
      });
    }

    return res.json({
      success: true,
      message: "Poet updated successfully",
      data: item,
    });
  } catch (err) {
    console.error("Update poet error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to update poet",
      error: err.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  const item = await Poet.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Poet not found" });
  res.json(serializePoet(item, req));
});

// router.put("/:id", auth, upload.single("image"), async (req, res) => {
//   try {
//     const body = normalizePoetBody(req.body || {});
//     if (req.file) {
//       const filePath =
//         "/" + (process.env.UPLOAD_DIR || "uploads") + "/" + req.file.filename;
//       body.avatar = filePath;
//       body.image = filePath;
//     }
//     const item = await Poet.findByIdAndUpdate(req.params.id, body, {
//       new: true,
//     });
//     res.json(item);
//   } catch (err) {
//     console.error("Update poet error:", err);
//     res.status(500).json({ message: "Failed to update poet" });
//   }
// });

router.delete("/:id", auth, async (req, res) => {
  await Poet.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
