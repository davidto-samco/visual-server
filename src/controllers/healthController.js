const { testConnection } = require("../database");

async function getHealth(req, res) {
  res.json({
    success: true,
    data: {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
}

async function getDatabaseHealth(req, res) {
  const status = await testConnection();
  res.status(status.connected ? 200 : 503).json({
    success: status.connected,
    data: {
      status: status.connected ? "connected" : "disconnected",
      responseTime: `${status.responseTime}ms`,
    },
  });
}

module.exports = { getHealth, getDatabaseHealth };
