/**
 * Centralised error handler middleware.
 * Must have 4 params so Express identifies it as an error handler.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  // Google Gemini API errors
  if (err.message && err.message.includes("API_KEY_INVALID")) {
    return res.status(503).json({
      error: "AI service configuration error. Please check your API key.",
    });
  }

  if (err.message && err.message.includes("SAFETY")) {
    return res.status(400).json({
      error: "Your message was flagged by safety filters. Please rephrase.",
    });
  }

  if (err.status === 429 || err.message?.includes("quota")) {
    return res.status(429).json({
      error: "AI quota exceeded. Please try again in a few seconds.",
    });
  }

  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    error:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred."
        : err.message,
  });
}

module.exports = { errorHandler };
