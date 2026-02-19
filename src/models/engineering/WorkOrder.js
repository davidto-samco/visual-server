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
  const base = wo.baseId;
  const hasLot = wo.lotId && wo.lotId.trim() !== "" && wo.lotId !== "0";
  const hasSub = wo.subId && wo.subId.trim() !== "" && wo.subId !== "0";

  if (hasSub && hasLot) {
    return `${base}-${wo.subId}/${wo.lotId}`;
  } else if (hasLot) {
    return `${base}/${wo.lotId}`;
  } else if (hasSub) {
    return `${base}-${wo.subId}`;
  }
  return base;
}

function formatWorkOrderStatus(status) {
  const mapped = STATUS_MAP[status];
  return mapped ? mapped.display : `[${status || "U"}]`;
}

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
