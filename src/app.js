const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const routes = require("./routes");
const { errorHandler, requestLogger, notFound } = require("./middleware");

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:5173"],
  })
);
app.use(compression());
app.use(express.json());
app.use(requestLogger);
app.use(process.env.API_PREFIX || "/api", routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
