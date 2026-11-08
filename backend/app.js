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
const HomeFeed = require("./models/HomeFeed");
const Poet = require("./models/Poet");

const app = express();
// Render/Vercel terminate TLS at a proxy; trust it so req.ip (used by OTP rate limits) is the client IP.
app.set("trust proxy", 1);
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

const escapeHtml = (value) =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const getShareImageUrl = (value, req) => {
  if (!value || typeof value !== "string") return "";
  if (/^https?:\/\//i.test(value)) return value;
  const filename = value.replace(/\\/g, "/").split("/").filter(Boolean).pop();
  return filename && /\.(jpe?g|png|webp)$/i.test(filename)
    ? `${req.protocol}://${req.get("host")}/uploads/${encodeURIComponent(filename)}`
    : "";
};

const renderSharePage = (req, res, { title, description, image, deepLink }) => {
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const pageUrl = escapeHtml(`${req.protocol}://${req.get("host")}${req.originalUrl}`);
  const safeDeepLink = escapeHtml(deepLink);
  const scriptDeepLink = JSON.stringify(deepLink).replace(/</g, "\\u003c");

  return res.type("html").send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${safeTitle} | Mawaddat</title>
    <meta name="description" content="${safeDescription}">
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="Mawaddat">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDescription}">
    <meta property="og:url" content="${pageUrl}">
    ${safeImage ? `<meta property="og:image" content="${safeImage}">` : ""}
    <meta name="twitter:card" content="${safeImage ? "summary_large_image" : "summary"}">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDescription}">
    ${safeImage ? `<meta name="twitter:image" content="${safeImage}">` : ""}
    <style>
      body { font: 16px system-ui, sans-serif; color: #2c1810; background: #f8f6f2; margin: 0; padding: 32px 18px; }
      main { max-width: 560px; margin: 8vh auto; padding: 24px; background: #fffdf9; border-radius: 20px; text-align: center; }
      img { display: block; width: 100%; max-height: 420px; object-fit: cover; border-radius: 14px; margin: 0 auto 20px; }
      a { display: inline-block; margin-top: 16px; padding: 12px 20px; border-radius: 24px; background: #2c1810; color: white; text-decoration: none; font-weight: 700; }
    </style>
  </head>
  <body>
    <main>
      ${safeImage ? `<img src="${safeImage}" alt="">` : ""}
      <h1>${safeTitle}</h1>
      <p>${safeDescription}</p>
      <a href="${safeDeepLink}">Open in Mawaddat</a>
    </main>
    <script>window.setTimeout(function () { window.location.href = ${scriptDeepLink}; }, 900);</script>
  </body>
</html>`);
};

app.use("/share", async (req, res, next) => {
  try {
    await connectToDatabase();
    return next();
  } catch (error) {
    console.error("Share page database connection failed:", error.name || "UnknownError");
    return res.status(503).send("Mawaddat share page is temporarily unavailable.");
  }
});

app.get("/share/post/:id", async (req, res) => {
  try {
    const post = await HomeFeed.findById(req.params.id);
    if (!post) return res.status(404).send("Post not found.");
    const content =
      typeof post.content === "string"
        ? post.content
        : post.content?.roman || post.content?.urdu || post.content?.hindi || "";
    return renderSharePage(req, res, {
      title: post.poetName || post.poet || post.title || "Mawaddat post",
      description: String(content || post.title || "").slice(0, 300),
      image: getShareImageUrl(post.image || post.avatar, req),
      deepLink: `mawaddatapp://post/${encodeURIComponent(String(post._id))}`,
    });
  } catch (error) {
    console.error("Post share page failed:", error.name || "UnknownError");
    return res.status(500).send("Unable to load this Mawaddat post.");
  }
});

app.get("/share/poet/:id", async (req, res) => {
  try {
    const poet = await Poet.findById(req.params.id);
    if (!poet) return res.status(404).send("Poet not found.");
    return renderSharePage(req, res, {
      title: poet.name || "Mawaddat poet",
      description: String(poet.bio || poet.description || "").slice(0, 300),
      image: getShareImageUrl(poet.image || poet.avatar, req),
      deepLink: `mawaddatapp://poet/${encodeURIComponent(String(poet._id))}`,
    });
  } catch (error) {
    console.error("Poet share page failed:", error.name || "UnknownError");
    return res.status(500).send("Unable to load this Mawaddat profile.");
  }
});

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
app.use("/api/promotions", carouselsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/notifications", notificationsRoutes);

module.exports = app;
