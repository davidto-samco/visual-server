const logger = require("../utils/logger");

function errorHandler(err, req, res, _next) {
  logger.error("Error", { error: err.message, path: req.path });

  if (err.isOperational) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message },
    });
  }

  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" },
  });
}

module.exports = errorHandler;
