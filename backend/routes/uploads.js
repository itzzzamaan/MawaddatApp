const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const auth = require("../middleware/auth");
const { saveImageAsset } = require("../database");

const allowedMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

const hasAllowedImageType = (file = {}) => {
  const mimeType = String(file.mimetype || file.type || "").toLowerCase();
  const ext = path.extname(file.originalname || file.filename || "").toLowerCase();
  return allowedMimeTypes.has(mimeType) || [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!hasAllowedImageType(file)) {
      return cb(new Error("Only JPG, JPEG, PNG, and WEBP images are allowed."));
    }
    cb(null, true);
  },
});

router.post("/", auth, upload.single("image"), async (req, res) => {
  try {
    if (req.body && req.body.imageBase64) {
      const mimeType = String(req.body.imageMimeType || "image/jpeg").toLowerCase();
      const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
      if (!allowed.includes(mimeType)) {
        return res.status(400).json({ message: "Unsupported image type" });
      }

      const base64 = String(req.body.imageBase64 || "").replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
      if (!base64) {
        return res.status(400).json({ message: "No image payload provided" });
      }

      const buffer = Buffer.from(base64, "base64");
      if (buffer.length === 0) {
        return res.status(400).json({ message: "Decoded image is empty" });
      }

      const saved = await saveImageAsset(buffer, mimeType);
      return res.json({ path: saved.path, filename: saved.filename });
    }

    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const saved = await saveImageAsset(req.file.buffer, req.file.mimetype);
    res.json({ path: saved.path, filename: saved.filename });
  } catch (err) {
    console.error("Image upload failed:", err.name || "UnknownError");
    res.status(500).json({ message: "Upload failed" });
  }
});

module.exports = router;
