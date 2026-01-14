const sql = require("mssql");
const dbConfig = require("../config/database");
const logger = require("../utils/logger");

let pool = null;

/**
 * Get database connection pool (creates if not exists)
 * @returns {Promise<sql.ConnectionPool>}
 */
async function getPool() {
  if (!pool) {
    try {
      logger.info("Creating database connection pool...");
      pool = await new sql.ConnectionPool(dbConfig).connect();

      pool.on("error", (err) => {
        logger.error("Database pool error", { error: err.message });
        pool = null;
      });
    } catch (error) {
      logger.error("Failed to create database connection pool", {
        error: error.message,
      });
      throw error;
    }
  }
  return pool;
}

/**
 * Close database connection pool
 */
async function closePool() {
  if (pool) {
    try {
      await pool.close();
      pool = null;
      logger.info("Database connection pool closed");
    } catch (error) {
      logger.error("Error closing database pool", { error: error.message });
      throw error;
    }
  }
}

/**
 * Test database connection
 * @returns {Promise<{connected: boolean, responseTime: number}>}
 */
async function testConnection() {
  const startTime = Date.now();
  try {
    const p = await getPool();
    await p.request().query("SELECT 1 AS test");
    return {
      connected: true,
      responseTime: Date.now() - startTime,
    };
  } catch (error) {
    return {
      connected: false,
      responseTime: Date.now() - startTime,
      error: error.message,
    };
  }
}

module.exports = {
  getPool,
  closePool,
  testConnection,
  sql,
};
