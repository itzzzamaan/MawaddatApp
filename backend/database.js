require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const crypto = require("crypto");
const mongoose = require("mongoose");
const ImageAsset = require("./models/ImageAsset");
const { detectImageType } = require("./utils/imageType");

let connectionPromise;

const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!connectionPromise) {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI must be configured before connecting to MongoDB");
    }

    connectionPromise = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
      .then(() => mongoose.connection)
      .catch((error) => {
        connectionPromise = null;
        throw error;
      });
  }

  return connectionPromise;
};

const getImageExtension = (contentType) => {
  const extensions = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };
  const extension = extensions[String(contentType).toLowerCase()];
  if (!extension) throw new Error("Unsupported image type");
  return extension;
};

// Images live in MongoDB (not on the host filesystem), so they survive Render restarts
// and redeploys. The stored type always comes from the file's bytes, never from the
// client-supplied `contentType`, and identical files are stored once.
const saveImageAsset = async (data, clientContentType) => {
  if (!Buffer.isBuffer(data) || data.length === 0) {
    throw new Error("Image data is empty");
  }

  const contentType = detectImageType(data);
  if (!contentType) throw new Error("Unsupported image type");

  const hash = crypto.createHash("sha256").update(data).digest("hex");
  let image = await ImageAsset.findOne({ hash, contentType }).select("_id contentType");
  if (!image) {
    image = await ImageAsset.create({ data, contentType, hash });
  }

  const filename = `${image._id}.${getImageExtension(contentType)}`;
  return { filename, path: `/uploads/${filename}` };
};

module.exports = { connectToDatabase, saveImageAsset };
