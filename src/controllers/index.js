const healthController = require("./healthController");
const partController = require("./inventory/partController");
const workOrderController = require("./engineering/workOrderController");
const orderController = require("./sales/orderController");

module.exports = {
  healthController,
  partController,
  workOrderController,
  orderController,
};
