const express = require("express");
const orderController = require("../controllers/sales/orderController");

const router = express.Router();

router.get("/orders", orderController.getOrders);
router.get("/orders/:jobNumber", orderController.getOrderByJobNumber);
router.get("/orders/:jobNumber/line-items", orderController.getOrderLineItems);
router.get(
  "/orders/:jobNumber/line-items/:lineNumber/extended-description",
  orderController.getLineExtendedDescription,
);

module.exports = router;
