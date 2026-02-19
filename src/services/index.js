const partService = require("./inventory/partService");
const workOrderService = require("./engineering/workOrderService");
const workOrderTreeService = require("./engineering/workOrderTreeService");
const orderService = require("./sales/orderService");

module.exports = {
  partService,
  workOrderService,
  workOrderTreeService,
  orderService,
};
