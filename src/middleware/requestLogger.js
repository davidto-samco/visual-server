const logger = require("../utils/logger");

function requestLogger(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    logger.info("Request", {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${Date.now() - start}ms`,
    });
  });
  next();
}

module.exports = requestLogger;
