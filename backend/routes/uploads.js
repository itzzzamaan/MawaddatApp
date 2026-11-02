const express = require("express");
const router = express.Router();
const multer = require("multer");
const auth = require("../middleware/auth");
const { saveImageAsset } = require("../database");

// Mobile clients (Expo Go / React Native) often send a wrong or generic
// mimetype and extensionless filenames (content:// URIs), so the real type is
// detected from the file's magic bytes instead of trusting the client.
const detectImageType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/", auth, (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (!err) return next();
    const tooLarge = err.code === "LIMIT_FILE_SIZE";
    return res.status(tooLarge ? 413 : 400).json({
      message: tooLarge ? "Image is larger than 10 MB." : "Invalid upload request.",
    });
  });
}, async (req, res) => {
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

      const saved = await saveImageAsset(buffer, detectImageType(buffer) || mimeType);
      return res.json({ path: saved.path, filename: saved.filename });
    }

    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const detectedType = detectImageType(req.file.buffer);
    if (!detectedType) {
      return res.status(400).json({ message: "Only JPG, PNG, and WEBP images are allowed." });
    }
    const saved = await saveImageAsset(req.file.buffer, detectedType);
    res.json({ path: saved.path, filename: saved.filename });
  } catch (err) {
    console.error("Image upload failed:", err.name || "UnknownError");
    res.status(500).json({ message: "Upload failed" });
  }
});

module.exports = router;
