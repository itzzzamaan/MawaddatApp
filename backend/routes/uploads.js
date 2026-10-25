const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const auth = require("../middleware/auth");

const sanitizeStoredImagePath = (value) => {
  if (!value || typeof value !== "string") return "";
  const normalized = value.replace(/\\/g, "/").replace(/\/+/g, "/").trim();
  if (!normalized) return "";
  if (/^https?:\/\//i.test(normalized)) return normalized;

  const uploadRoot = (process.env.UPLOAD_DIR || "uploads").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const matches = normalized.match(/(?:^|.*?\/uploads\/)([^/?#]+)$/i) || normalized.match(/(?:^|.*?\/)([^/?#]+\.(?:jpe?g|png|webp))$/i);
  const fileName = matches ? matches[1] : normalized.split("/").filter(Boolean).pop();
  if (!fileName) return "";
  return `/${uploadRoot}/${fileName}`;
};

const normalizeUploadPath = (value) => {
  const cleaned = sanitizeStoredImagePath(value);
  if (!cleaned) return "";
  return cleaned.startsWith("/") ? cleaned : `/${cleaned}`;
};

// const uploadDir = process.env.UPLOAD_DIR || "uploads";

// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

const uploadDir = path.resolve(
  __dirname,
  "..",
  process.env.UPLOAD_DIR || "uploads",
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const base = (file.originalname || "upload")
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueName = `${Date.now()}-${base}${ext || ".jpg"}`;
    cb(null, uniqueName);
  },
});

const allowedMimeTypes = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

const hasAllowedImageType = (file = {}) => {
  const mimeType = String(file.mimetype || file.type || "").toLowerCase();
  const ext = path.extname(file.originalname || file.filename || "").toLowerCase();
  return allowedMimeTypes.has(mimeType) || [".jpg", ".jpeg", ".png", ".webp"].includes(ext);
};

const upload = multer({
  storage,
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

      const ext = mimeType.includes("png") ? ".png" : mimeType.includes("webp") ? ".webp" : ".jpg";
      const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
      const savedPath = path.join(uploadDir, filename);
      fs.writeFileSync(savedPath, buffer);

      const p = normalizeUploadPath(savedPath);
      return res.json({ path: p, filename });
    }

    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const p = normalizeUploadPath(req.file.path || `/${uploadDir}/${req.file.filename}`);
    if (!p || !p.includes('/uploads/')) {
      return res.status(400).json({ message: "Invalid upload path" });
    }
    res.json({ path: p });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload failed" });
  }
});

module.exports = router;
