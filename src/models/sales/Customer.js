/**
 * Format full address
 * @param {Object} address - Address object
 * @returns {string} Formatted multi-line address
 */
function formatAddress(address) {
  const parts = [
    address.address1,
    address.address2,
    address.address3,
    `${address.city}, ${address.state} ${address.zipCode}`.trim(),
    address.country,
  ].filter(Boolean);

  return parts.join("\n");
}

/**
 * Format single-line address
 */
function formatAddressSingleLine(address) {
  const parts = [
    address.address1,
    address.city,
    address.state,
    address.zipCode,
  ].filter(Boolean);

  return parts.join(", ");
}

module.exports = {
  formatAddress,
  formatAddressSingleLine,
};
