const logger = require("../utils/logger");

function errorHandler(err, req, res, _next) {
  logger.error("Error", { error: err.message, code: err.code, path: req.path });

  // Handle operational errors (our custom error classes)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  // Handle mssql timeout errors (ETIMEOUT, EREQUEST with timeout)
  if (
    err.code === "ETIMEOUT" ||
    (err.code === "EREQUEST" && /timeout/i.test(err.message))
  ) {
    return res.status(408).json({
      success: false,
      error: {
        code: "TIMEOUT",
        message: "Request timeout — the query took too long to complete",
      },
    });
  }

  // Handle mssql connection errors
  if (
    err.code === "ECONNREFUSED" ||
    err.code === "ESOCKET" ||
    err.code === "ECONNRESET"
  ) {
    return res.status(503).json({
      success: false,
      error: { code: "DATABASE_ERROR", message: "Database connection error" },
    });
  }

  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
  });
}

module.exports = errorHandler;
