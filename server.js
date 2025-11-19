const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
// MongoDB connection - UPDATED VERSION
const MONGODB_URI = process.env.MONGODB_URI;

console.log("🔗 Attempting MongoDB connection...");
console.log("MongoDB URI:", MONGODB_URI ? "Set" : "Not set");

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected successfully"))
  .catch((err) => {
    console.log("❌ MongoDB connection error:", err.message);
    console.log("Please check your MONGODB_URI in environment variables");
  });

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/properties", require("./routes/properties"));
app.use("/api/tenants", require("./routes/tenants"));
app.use("/api/payments", require("./routes/payments"));
app.use("/api/maintenance", require("./routes/maintenance"));

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "SmartRent API is running" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
