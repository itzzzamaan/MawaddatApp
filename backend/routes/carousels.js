const express = require("express");
const router = express.Router();
const CarouselSlide = require("../models/CarouselSlide");
const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");
const { saveImageAsset } = require("../database");
const multer = require("multer");
const path = require("path");

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

const getPlacement = (req) =>
  req.baseUrl.endsWith("/promotions") ? "promotion" : "home";

const getPlacementFilter = (req) =>
  getPlacement(req) === "promotion"
    ? { placement: "promotion" }
    : { $or: [{ placement: "home" }, { placement: { $exists: false } }] };

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
  const items = await CarouselSlide.find(getPlacementFilter(req)).sort({
    order: 1,
    createdAt: -1,
  });
  res.json(items.map((item) => serializeCarousel(item, req)));
});

router.post("/", auth, adminOnly, upload.single("image"), async (req, res) => {
  try {
    const body = normalizeCarouselBody(req.body || {});
    body.placement = getPlacement(req);

    if (req.file) {
      if (req.file.size === 0) {
        return res.status(400).json({
          success: false,
          message: "Uploaded file is empty",
        });
      }
      const saved = await saveImageAsset(req.file.buffer, req.file.mimetype);
      body.image = saved.path;
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
  const item = await CarouselSlide.findOne({
    _id: req.params.id,
    ...getPlacementFilter(req),
  });
  if (!item) return res.status(404).json({ message: "Carousel slide not found" });
  res.json(serializeCarousel(item, req));
});

router.put("/:id", auth, adminOnly, upload.single("image"), async (req, res) => {
  try {
    const body = normalizeCarouselBody(req.body || {});
    body.placement = getPlacement(req);
    if (req.file?.buffer) {
      const saved = await saveImageAsset(req.file.buffer, req.file.mimetype);
      body.image = saved.path;
    }
    const item = await CarouselSlide.findOneAndUpdate(
      { _id: req.params.id, ...getPlacementFilter(req) },
      body,
      { new: true, runValidators: true },
    );
    if (!item) return res.status(404).json({ message: "Carousel slide not found" });
    res.json(item);
  } catch (err) {
    console.error("Update carousel error:", err);
    res.status(500).json({ message: "Failed to update carousel slide" });
  }
});

router.delete("/:id", auth, adminOnly, async (req, res) => {
  const item = await CarouselSlide.findOneAndDelete({
    _id: req.params.id,
    ...getPlacementFilter(req),
  });
  if (!item) return res.status(404).json({ message: "Carousel slide not found" });
  res.json({ success: true });
});

module.exports = router;
