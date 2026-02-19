const express = require("express");
const orderController = require("../controllers/sales/orderController");

const router = express.Router();

// GET /api/sales/orders - List/search/filter orders
router.get("/orders", orderController.getOrders);

// GET /api/sales/orders/:jobNumber - Get order acknowledgement
router.get("/orders/:jobNumber", orderController.getOrderByJobNumber);

// GET /api/sales/orders/:jobNumber/line-items - Get line items (paginated)
router.get("/orders/:jobNumber/line-items", orderController.getOrderLineItems);

// GET /api/sales/orders/:jobNumber/line-items/:lineNumber/extended-description
router.get(
  "/orders/:jobNumber/line-items/:lineNumber/extended-description",
  orderController.getLineExtendedDescription,
);

module.exports = router;
