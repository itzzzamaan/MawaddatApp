require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const app = require("./app");
const { connectToDatabase } = require("./database");

const PORT = process.env.PORT || 4000;
const HOST = process.env.HOST || "0.0.0.0";

connectToDatabase()
  .then(() => {
    console.log("Mongo connected");
    app.listen(PORT, HOST, () =>
      console.log(`Server running on http://${HOST}:${PORT}`),
    );
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.name || "UnknownError");
    process.exitCode = 1;
  });
