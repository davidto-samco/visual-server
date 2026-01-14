/**
 * Format a number with specified decimal places
 * @param {number} value - Number to format
 * @param {number} [decimals=4] - Decimal places
 * @returns {string} Formatted number
 */
function formatDecimal(value, decimals = 4) {
  if (value === null || value === undefined) return "0.0000";
  return Number(value).toFixed(decimals);
}

/**
 * Format a percentage value
 * @param {number} value - Percentage value
 * @returns {string} Formatted percentage
 */
function formatPercent(value) {
  if (value === null || value === undefined) return "0.00%";
  return `${Number(value).toFixed(2)}%`;
}

/**
 * Format a currency value
 * @param {number} value - Currency value
 * @returns {string} Formatted currency
 */
function formatCurrency(value) {
  if (value === null || value === undefined) value = 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

/**
 * Format a date string to MM/DD/YYYY
 * @param {string|Date} dateStr - Date string or Date object
 * @returns {string} Formatted date
 */
function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });
}

module.exports = {
  formatDecimal,
  formatPercent,
  formatCurrency,
  formatDate,
};
