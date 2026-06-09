require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const path = require("path");
const rateLimit = require("express-rate-limit");

const chatRouter = require("./src/routes/chat");
const venueRouter = require("./src/routes/venue");
const { errorHandler } = require("./src/middleware/errorHandler");

const app = express();
const PORT = process.env.PORT || 8080;

// ── Security & Performance Middleware ──────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  })
);

app.use(compression());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(cors({ origin: process.env.ALLOWED_ORIGIN || "*" }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));

// ── Rate Limiting ──────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please wait a moment and try again.",
  },
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use("/api/chat", apiLimiter, chatRouter);
app.use("/api/venue", venueRouter);

// Health check endpoint (required for Cloud Run)
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "VenueFlow",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// Serve static frontend
app.use(express.static(path.join(__dirname, "public")));

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ── Error Handler ──────────────────────────────────────────────────────────────
app.use(errorHandler);

// ── Start Server ───────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ VenueFlow server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

module.exports = app;
