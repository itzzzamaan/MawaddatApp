const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const uploadDir = path.resolve(
  __dirname,
  "..",
  process.env.UPLOAD_DIR || "uploads",
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const getExtensionFromMimeOrName = (mimetype = "", originalname = "") => {
  const ext = path.extname(originalname || "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return ext === ".jpeg" ? ".jpg" : ext;
  }
  const mime = String(mimetype).toLowerCase();
  if (mime.includes("png")) return ".png";
  if (mime.includes("webp")) return ".webp";
  return ".jpg";
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = getExtensionFromMimeOrName(file.mimetype, file.originalname);
    const base = (file.originalname || "upload")
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 50);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`;
    cb(null, uniqueName);
  },
});

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const hasAllowedImageType = (file = {}) => {
  const mimeType = String(file.mimetype || file.type || "").toLowerCase();
  const ext = path.extname(file.originalname || file.filename || "").toLowerCase();
  return (
    allowedMimeTypes.has(mimeType) ||
    [".jpg", ".jpeg", ".png", ".webp"].includes(ext)
  );
};

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25 MB
    fieldSize: 35 * 1024 * 1024, // 35 MB
  },
  fileFilter: (req, file, cb) => {
    if (!hasAllowedImageType(file)) {
      return cb(new Error("Only JPG, JPEG, PNG, and WEBP images are allowed."));
    }
    cb(null, true);
  },
});

// Optional / flexible auth verification for uploads
const verifyAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // If no header, allow upload to proceed (useful during setup or user submissions)
    return next();
  }
  const token = authHeader.split(" ")[1];
  if (!token) return next();

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "mawaddat_secure_secret_2026",
    );
    req.user = payload;
    req.admin = payload;
    next();
  } catch (err) {
    console.warn("Upload auth token warning:", err.message);
    // Proceed if valid token couldn't be parsed or let it continue
    next();
  }
};

router.post("/", verifyAuth, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      console.error("Multer upload error:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed",
      });
    }

    try {
      // 1. Direct file upload via Multer (multipart/form-data)
      if (req.file) {
        const relativePath = `/uploads/${req.file.filename}`;
        const fullUrl = `${req.protocol}://${req.get("host")}${relativePath}`;
        console.log(`[Upload] File saved successfully: ${relativePath}`);
        return res.status(200).json({
          success: true,
          path: relativePath,
          filename: req.file.filename,
          url: fullUrl,
        });
      }

      // 2. Base64 encoded image upload in body
      const rawPayload = req.body?.imageBase64 || req.body?.image;
      if (rawPayload && typeof rawPayload === "string") {
        if (rawPayload.startsWith("/uploads/")) {
          return res.status(200).json({
            success: true,
            path: rawPayload,
            filename: rawPayload.split("/").pop(),
          });
        }

        const mimeType = String(req.body.imageMimeType || "image/jpeg").toLowerCase();
        const base64Data = rawPayload.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");

        if (!base64Data.trim()) {
          return res.status(400).json({ success: false, message: "Empty base64 image data" });
        }

        const buffer = Buffer.from(base64Data, "base64");
        if (buffer.length === 0) {
          return res.status(400).json({ success: false, message: "Decoded image is empty" });
        }

        const ext = getExtensionFromMimeOrName(mimeType);
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}-upload${ext}`;
        const savedPath = path.join(uploadDir, filename);

        fs.writeFileSync(savedPath, buffer);

        const relativePath = `/uploads/${filename}`;
        const fullUrl = `${req.protocol}://${req.get("host")}${relativePath}`;
        console.log(`[Upload] Base64 saved successfully: ${relativePath}`);

        return res.status(200).json({
          success: true,
          path: relativePath,
          filename,
          url: fullUrl,
        });
      }

      return res.status(400).json({
        success: false,
        message: "No image file or image data received",
      });
    } catch (handlerErr) {
      console.error("Upload handler exception:", handlerErr);
      return res.status(500).json({
        success: false,
        message: "Upload processing failed: " + handlerErr.message,
      });
    }
  });
});

module.exports = router;
