const express = require("express");
const router = express.Router();
const workOrderController = require("../controllers/engineering/workOrderController");

router.get("/work-orders/search", workOrderController.search);
router.get("/work-orders/:baseId/:lotId/:subId", workOrderController.getHeader);
router.get(
  "/work-orders/:baseId/:lotId/:subId/operations",
  workOrderController.getOperations,
);
router.get(
  "/work-orders/:baseId/:lotId/:subId/operations/:sequence/requirements",
  workOrderController.getRequirements,
);
router.get(
  "/work-orders/:baseId/:lotId/:subId/sub-work-orders",
  workOrderController.getSubWorkOrders,
);
router.get(
  "/work-orders/:baseId/:lotId/:subId/wip-balance",
  workOrderController.getWipBalance,
);

module.exports = router;
