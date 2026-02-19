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

module.exports = { formatRequirement };
