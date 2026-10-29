const mongoose = require("mongoose");
const ImageAsset = require("./models/ImageAsset");

let connectionPromise;

const getMongoUri = () => {
  if (process.env.MONGO_URI) return process.env.MONGO_URI;
  if (process.env.NODE_ENV === "production") {
    throw new Error("MONGO_URI is required in production");
  }
  return "mongodb://localhost:27017/mawaddat";
};

const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(getMongoUri(), { serverSelectionTimeoutMS: 10000 })
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
