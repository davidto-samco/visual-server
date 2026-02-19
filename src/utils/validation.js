const { ValidationError } = require("./errors");

/**
 * Validate that a string parameter is not empty
 * @param {string|undefined} value - Value to validate
 * @param {string} fieldName - Field name for error message
 * @returns {string} Trimmed value
 * @throws {ValidationError} If value is empty
 */
function validateRequired(value, fieldName) {
  if (!value || value.trim() === "") {
    throw new ValidationError(`${fieldName} is required`);
  }
  return value.trim();
}

/**
 * Validate pagination parameters
 * @param {number} [page] - Page number
 * @param {number} [limit] - Results per page
 * @returns {{page: number, limit: number}} Validated pagination
 */
function validatePagination(page, limit) {
  const validPage = Math.max(1, parseInt(page) || 1);
  const validLimit = Math.min(1000, Math.max(1, parseInt(limit) || 50));
  return { page: validPage, limit: validLimit };
}

/**
 * Calculate pagination offset
 * @param {number} page - Page number
 * @param {number} limit - Results per page
 * @returns {number} Offset
 */
function calculateOffset(page, limit) {
  return (page - 1) * limit;
}

/**
 * Calculate total pages
 * @param {number} total - Total records
 * @param {number} limit - Results per page
 * @returns {number} Total pages
 */
function calculateTotalPages(total, limit) {
  return Math.ceil(total / limit);
}

function validateDate(dateStr, fieldName) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new ValidationError(`${fieldName} must be a valid date (YYYY-MM-DD)`);
  }
  return date;
}

module.exports = {
  validateRequired,
  validatePagination,
  validateDate,
  calculateOffset,
  calculateTotalPages,
};
