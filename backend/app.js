const express = require("express");
const cors = require("cors");
const path = require("path");
const { connectToDatabase } = require("./database");

const authRoutes = require("./routes/auth");
const eventsRoutes = require("./routes/events");
const poetsRoutes = require("./routes/poets");
const homefeedsRoutes = require("./routes/homefeeds");
const carouselsRoutes = require("./routes/carousels");
const usersRoutes = require("./routes/users");
const uploadsRoutes = require("./routes/uploads");
const notificationsRoutes = require("./routes/notifications");
const ImageAsset = require("./models/ImageAsset");

const app = express();
app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], // Allow specific HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
    credentials: true, // Allow credentials (cookies, authorization headers, etc.)
  }),
);
app.use(express.json());

const UPLOAD_DIR = path.resolve(__dirname, process.env.UPLOAD_DIR || "uploads");

app.use("/uploads", express.static(UPLOAD_DIR));

app.use("/api", async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    const missingMongoUri = !process.env.MONGO_URI;
    const code = missingMongoUri
      ? "MONGO_URI_MISSING"
      : "MONGODB_CONNECTION_FAILED";

    console.error(
      `${code}:`,
      error.name || "UnknownError",
      error.code || "",
    );
    res.status(503).json({
      code,
      message: missingMongoUri
        ? "Backend database configuration is missing. Set MONGO_URI in Vercel and redeploy."
        : "Backend cannot connect to MongoDB. Check the Atlas database user, password, and Network Access allowlist.",
    });
  }
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", database: "connected" });
});

app.get("/uploads/:filename", async (req, res, next) => {
  const match = req.params.filename.match(/^([a-f\d]{24})\.(?:jpe?g|png|webp)$/i);
  if (!match) return next();

  try {
    await connectToDatabase();
    const image = await ImageAsset.findById(match[1]);
    if (!image) return res.sendStatus(404);

    res.set("Content-Type", image.contentType);
    res.set("Cache-Control", "public, max-age=31536000, immutable");
    return res.send(image.data);
  } catch (error) {
    console.error("Image retrieval failed:", error.name || "UnknownError");
    return res.status(503).json({ message: "Image storage unavailable." });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/poets", poetsRoutes);
app.use("/api/homefeeds", homefeedsRoutes);
app.use("/api/carousels", carouselsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/notifications", notificationsRoutes);

module.exports = app;
