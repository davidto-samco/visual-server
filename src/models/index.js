const { formatWhereUsed } = require("./inventory/WhereUsed");
const { formatWorkOrder } = require("./engineering/WorkOrder");
const { formatOperation } = require("./engineering/Operation");
const { formatRequirement } = require("./engineering/Requirement");

module.exports = {
  formatWhereUsed,
  formatWorkOrder,
  formatOperation,
  formatRequirement,
};
