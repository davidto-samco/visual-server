const { formatWorkOrderId } = require("../engineering/WorkOrder");

function formatWhereUsed(record) {
  const formatted = formatWorkOrderId(record);
  return {
    ...record,
    workOrderMaster:
      record.workOrderType === "M" ? `M ${formatted}` : formatted,
    formattedQtyPer: (record.qtyPer || 0).toFixed(4),
    formattedFixedQty: (record.fixedQty || 0).toFixed(4),
    formattedScrapPercent: `${(record.scrapPercent || 0).toFixed(2)}%`,
  };
}

module.exports = { formatWhereUsed };
