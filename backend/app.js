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
const notificationsRoutes = require("./routes/notifications");

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

// const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
// if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// app.use('/uploads', express.static(path.join(__dirname, UPLOAD_DIR)));

const UPLOAD_DIR = path.resolve(__dirname, process.env.UPLOAD_DIR || "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

app.use("/uploads", express.static(UPLOAD_DIR));
console.log("Upload directory:", UPLOAD_DIR);

app.use("/api/auth", authRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/poets", poetsRoutes);
app.use("/api/homefeeds", homefeedsRoutes);
app.use("/api/carousels", carouselsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/notifications", notificationsRoutes);

module.exports = app;
