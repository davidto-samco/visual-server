const express = require("express");
const orderController = require("../controllers/sales/orderController");
const quoteController = require("../controllers/sales/quoteController");

const router = express.Router();

// Order endpoints
router.get("/orders", orderController.getOrders);
router.get("/orders/:jobNumber", orderController.getOrderByJobNumber);
router.get("/orders/:jobNumber/line-items", orderController.getOrderLineItems);
router.get(
  "/orders/:jobNumber/line-items/:lineNumber/extended-description",
  orderController.getLineExtendedDescription,
);

// Quote endpoints
router.get("/quotes/:quoteId", quoteController.getQuoteByQuoteId);

module.exports = router;
