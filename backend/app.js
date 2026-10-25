require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const authRoutes = require("./routes/auth");
const eventsRoutes = require("./routes/events");
const poetsRoutes = require("./routes/poets");
const homefeedsRoutes = require("./routes/homefeeds");
const carouselsRoutes = require("./routes/carousels");
const usersRoutes = require("./routes/users");
const uploadsRoutes = require("./routes/uploads");

const app = express();
app.use(
  cors({
    origin: "*", // Allow all origins
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"], // Allow specific HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allow specific headers
    credentials: true,
  }),
);
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

const UPLOAD_DIR = path.resolve(__dirname, process.env.UPLOAD_DIR || "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use("/uploads", express.static(UPLOAD_DIR, {
  etag: true,
  maxAge: "1d",
}));
console.log("Upload directory:", UPLOAD_DIR);

app.use("/api/auth", authRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/poets", poetsRoutes);
app.use("/api/homefeeds", homefeedsRoutes);
app.use("/api/carousels", carouselsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/uploads", uploadsRoutes);

module.exports = app;
