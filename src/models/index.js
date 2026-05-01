const { formatWhereUsed } = require("./inventory/WhereUsed");
const { formatePurchaseHistory } = require("./inventory/PurchaseHistory");
const { formatWorkOrder } = require("./engineering/WorkOrder");
const { formatOperation } = require("./engineering/Operation");
const { formatRequirement } = require("./engineering/Requirement");

module.exports = {
  formatWhereUsed,
  formatePurchaseHistory,
  formatWorkOrder,
  formatOperation,
  formatRequirement,
};
