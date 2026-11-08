const express = require("express");
const router = express.Router();
const multer = require("multer");
const auth = require("../middleware/auth");
const { saveImageAsset } = require("../database");
const { detectImageType } = require("../utils/imageType");

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

// Absolute URL for an uploaded file; PUBLIC_BASE_URL wins over the request host.
const publicUrl = (req, imagePath) => {
  const base = (
    process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`
  ).replace(/\/+$/, "");
  return `${base}${imagePath}`;
};

const respond = (req, res, saved) =>
  res.json({
    path: saved.path,
    filename: saved.filename,
    url: publicUrl(req, saved.path),
  });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES },
});

// Web and mobile both POST multipart/form-data with the file in the `image` field.
// The client-supplied mimetype/filename are ignored: the type is detected from the bytes.

router.post(
  "/",
  auth,
  (req, res, next) => {
    upload.single("image")(req, res, (err) => {
      if (!err) return next();
      const tooLarge = err.code === "LIMIT_FILE_SIZE";
      return res.status(tooLarge ? 413 : 400).json({
        message: tooLarge
          ? "Image is larger than 10 MB."
          : "Invalid upload request.",
      });
    });
  },
  async (req, res) => {
    try {
      if (req.body && req.body.imageBase64) {
        const base64 = String(req.body.imageBase64).replace(
          /^data:image\/[a-zA-Z0-9.+-]+;base64,/,
          "",
        );
        const buffer = Buffer.from(base64, "base64");
        if (buffer.length === 0) {
          return res.status(400).json({ message: "No image payload provided" });
        }
        if (buffer.length > MAX_IMAGE_BYTES) {
          return res
            .status(413)
            .json({ message: "Image is larger than 10 MB." });
        }
        if (!detectImageType(buffer)) {
          return res
            .status(400)
            .json({ message: "Only JPG, PNG, and WEBP images are allowed." });
        }
        return respond(req, res, await saveImageAsset(buffer));
      }

      if (!req.file)
        return res.status(400).json({ message: "No file uploaded" });
      if (!detectImageType(req.file.buffer)) {
        return res
          .status(400)
          .json({ message: "Only JPG, PNG, and WEBP images are allowed." });
      }
      return respond(req, res, await saveImageAsset(req.file.buffer));
    } catch (err) {
      console.error("Image upload failed:", err.name || "UnknownError");
      res.status(500).json({ message: "Upload failed" });
    }
  },
);

module.exports = router;
