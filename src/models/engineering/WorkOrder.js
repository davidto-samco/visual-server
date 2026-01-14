// Status codes: U=Unreleased, F=Firm, R=Released, C=Closed, X=Cancelled
const STATUS_MAP = {
  U: { label: "Unreleased", display: "[U]" },
  F: { label: "Firm", display: "[F]" },
  R: { label: "Released", display: "[R]" },
  C: { label: "Closed", display: "[C]" },
  X: { label: "Cancelled", display: "[X]" },
};

/**
 * Format work order ID for display
 * @param {Object} wo - Work order object
 * @returns {string} Formatted ID like "8113-SUB/00" or "8113/00"
 */
function formatWorkOrderId(wo) {
  if (wo.subId && wo.subId.trim() !== "" && wo.subId !== "0") {
    return `${wo.baseId}-${wo.subId}/${wo.lotId}`;
  }
  return `${wo.baseId}/${wo.lotId}`;
}

/**
 * Format work order status for display
 * @param {string} status - Status string
 * @returns {string} Formatted status like "[C]" for Closed
 */
function formatWorkOrderStatus(status) {
  const mapped = STATUS_MAP[status];
  return mapped ? mapped.display : `[${status || "U"}]`;
}

/**
 * Format work order with display values
 * @param {Object} wo - Work order from database
 * @returns {Object} Work order with formatted fields
 */
function formatWorkOrder(wo) {
  return {
    ...wo,
    formattedId: formatWorkOrderId(wo),
    formattedStatus: formatWorkOrderStatus(wo.status),
    formattedQty: wo.orderQty ? wo.orderQty.toFixed(4) : "0.0000",
  };
}

module.exports = {
  formatWorkOrderId,
  formatWorkOrderStatus,
  formatWorkOrder,
};
