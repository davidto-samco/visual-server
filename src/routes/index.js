const express = require("express");
const router = express.Router();
const healthController = require("../controllers/healthController");
const inventoryRouter = require("./inventory.routes");
const engineeringRouter = require("./engineering.routes");

router.get("/health", healthController.getHealth);
router.get("/health/db", healthController.getDatabaseHealth);
router.use("/inventory", inventoryRouter);
router.use("/engineering", engineeringRouter);

module.exports = router;
