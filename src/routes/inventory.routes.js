const express = require("express");
const router = express.Router();
const partController = require("../controllers/inventory/partController");

router.get("/parts/search", partController.search);
router.get("/parts/:partId", partController.getById);
router.get("/parts/:partId/where-used", partController.getWhereUsed);
router.get(
  "/parts/:partId/extended-description",
  partController.getExtendedDescription
);

module.exports = router;
