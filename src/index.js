require("dotenv").config();

const app = require("./app");
const { closePool } = require("./database");
const logger = require("./utils/logger");

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`);
});

process.on("SIGTERM", async () => {
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
});
