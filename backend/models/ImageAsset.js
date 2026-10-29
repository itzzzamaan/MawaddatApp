const mongoose = require("mongoose");

const ImageAssetSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true },
    contentType: {
      type: String,
      enum: ["image/jpeg", "image/jpg", "image/png", "image/webp"],
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ImageAsset", ImageAssetSchema);
