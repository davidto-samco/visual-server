/**
 * Format where-used record for display
 * @param {Object} record - Where-used record from database
 * @returns {Object} Record with formatted fields
 */
function formatWhereUsed(record) {
  return {
    ...record,
    formattedQtyPer: (record.qtyPer || 0).toFixed(4),
    formattedFixedQty: (record.fixedQty || 0).toFixed(4),
    formattedScrapPercent: `${(record.scrapPercent || 0).toFixed(2)}%`,
  };
}

module.exports = { formatWhereUsed };
