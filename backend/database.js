require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const mongoose = require("mongoose");
const ImageAsset = require("./models/ImageAsset");

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

const saveImageAsset = async (data, contentType) => {
  if (!Buffer.isBuffer(data) || data.length === 0) {
    throw new Error("Image data is empty");
  }

  const extension = getImageExtension(contentType);
  const image = await ImageAsset.create({
    data,
    contentType: contentType.toLowerCase(),
  });
  const filename = `${image._id}.${extension}`;

  return { filename, path: `/uploads/${filename}` };
};

module.exports = { connectToDatabase, saveImageAsset };
