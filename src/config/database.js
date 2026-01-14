module.exports = {
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE || "SAMCO",
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || "1433"),
  options: {
    encrypt: process.env.DB_ENCRYPT === "true",
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === "true",
    enableArithAbort: true,
  },
  pool: {
    min: parseInt(process.env.DB_POOL_MIN || "2"),
    max: parseInt(process.env.DB_POOL_MAX || "10"),
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: parseInt(process.env.DB_CONNECTION_TIMEOUT || "30000"),
  requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || "30000"),
};
