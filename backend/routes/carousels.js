const express = require("express");
const router = express.Router();
const CarouselSlide = require("../models/CarouselSlide");
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

const normalizeCarouselBody = (body = {}) => {
  const normalized = { ...body };

  if (!normalized.title && normalized.label)
    normalized.title = normalized.label;
  if (!normalized.subtitle && normalized.description)
    normalized.subtitle = normalized.description;

  if (normalized.socialLinks && typeof normalized.socialLinks === "string") {
    try {
      normalized.socialLinks = JSON.parse(normalized.socialLinks);
    } catch (err) {
      normalized.socialLinks = {};
    }
  }

  if (
    normalized.order !== undefined &&
    normalized.order !== null &&
    typeof normalized.order === "string"
  ) {
    normalized.order = Number(normalized.order);
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

const serializeCarousel = (item, req) => {
  if (!item) return item;
  const data = { ...item.toObject ? item.toObject() : item };
  if (data.image) data.image = normalizePublicImageUrl(data.image, req);
  return data;
};

router.get("/", async (req, res) => {
  const items = await CarouselSlide.find().sort({ order: 1, createdAt: -1 });
  res.json(items.map((item) => serializeCarousel(item, req)));
});

// router.post("/", auth, upload.single("image"), async (req, res) => {
//   try {
//     const body = normalizeCarouselBody(req.body || {});
//     if (req.file)
//       body.image =
//         "/" + (process.env.UPLOAD_DIR || "uploads") + "/" + req.file.filename;
//     const item = new CarouselSlide(body);
//     await item.save();
//     res.json(item);
//   } catch (err) {
//     console.error("Create carousel error:", err);
//     res.status(500).json({ message: "Failed to create carousel slide" });
//   }
// });

router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    console.log("Upload directory:", UPLOAD_DIR);
    console.log("Request body:", req.body);
    console.log("Uploaded file:", req.file);

    const body = normalizeCarouselBody(req.body || {});

    if (req.file) {
      if (req.file.size === 0) {
        return res.status(400).json({
          success: false,
          message: "Uploaded file is empty",
        });
      }
      // Store only the relative URL in MongoDB.
      body.image = `/uploads/${req.file.filename}`;
    } else if (typeof body.image === "string" && body.image.trim()) {
      // Admin app uploads via /api/uploads first and sends the resulting path.
      const filename = getSafeImageFilename(body.image);
      if (!filename && !/^https?:\/\//i.test(body.image)) {
        return res.status(400).json({
          success: false,
          message: "Invalid image path",
        });
      }
      if (filename) body.image = `/uploads/${filename}`;
    } else {
      return res.status(400).json({
        success: false,
        message: "Image was not received",
      });
    }

    const item = new CarouselSlide(body);
    await item.save();

    return res.status(201).json({
      success: true,
      message: "Carousel created successfully",
      data: item,
      imageUrl: body.image,
    });
  } catch (err) {
    console.error("Create carousel error:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to create carousel slide",
      error: err.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  const item = await CarouselSlide.findById(req.params.id);
  if (!item) return res.status(404).json({ message: "Carousel slide not found" });
  res.json(serializeCarousel(item, req));
});

router.put("/:id", auth, upload.single("image"), async (req, res) => {
  try {
    const body = normalizeCarouselBody(req.body || {});
    if (req.file)
      body.image =
        "/" + (process.env.UPLOAD_DIR || "uploads") + "/" + req.file.filename;
    const item = await CarouselSlide.findByIdAndUpdate(req.params.id, body, {
      new: true,
    });
    res.json(item);
  } catch (err) {
    console.error("Update carousel error:", err);
    res.status(500).json({ message: "Failed to update carousel slide" });
  }
});

router.delete("/:id", auth, async (req, res) => {
  await CarouselSlide.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

module.exports = router;
