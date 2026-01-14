/**
 * Format requirement for display
 * @param {Object} req - Requirement from database
 * @returns {Object} Requirement with formatted fields
 */
function formatRequirement(req) {
  return {
    ...req,
    formattedPart: `${req.partId} - ${req.partDescription || "Unknown"}`,
    formattedQty: `Qty: ${(req.qtyPer || 0).toFixed(4)}`,
    formattedScrap: `${(req.scrapPercent || 0).toFixed(2)}%`,
    formattedDisplay: `${req.partId} - ${
      req.partDescription || "Unknown"
    } - Qty: ${(req.qtyPer || 0).toFixed(4)}`,
  };
}

function hasSubordinateWorkOrder(req) {
  return req.subordWoSubId != null && req.subordWoSubId.trim() !== "";
}

module.exports = { formatRequirement, hasSubordinateWorkOrder };
