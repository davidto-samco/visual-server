const { formatDate, formatCurrency } = require("./Order");

/**
 * Map quote status code to human-readable label.
 */
function formatQuoteStatus(status) {
  const statusMap = {
    P: "Pending",
    W: "Won",
    L: "Lost",
    C: "Cancelled",
  };
  return statusMap[status?.trim()] || status?.trim() || "Unknown";
}

/**
 * Format the full quote document response.
 */
function formatQuoteDocument(header, description, lineItems, linkedOrders) {
  return {
    quoteId: header.quoteId?.trim() || "",
    status: formatQuoteStatus(header.status),
    quoteDate: formatDate(header.quoteDate),
    expirationDate: formatDate(header.expirationDate),
    currency: header.currencyId?.trim() || "USD",
    customer: formatQuoteCustomer(header),
    contact: formatQuoteContact(header),
    salesRep: formatQuoteSalesRep(header),
    description: description || "",
    terms: {
      description: header.termsDescription?.trim() || "",
      shipVia: header.shipVia?.trim() || "",
      freeOnBoard: header.freeOnBoard?.trim() || "",
      freightTerms: header.freightTerms?.trim() || "",
      quotedLeadtimeWeeks: header.quotedLeadtime || null,
    },
    lineItems: lineItems.map(formatQuoteLineItem),
    totalPrice: calculateTotal(lineItems),
    formattedTotalPrice: formatCurrency(calculateTotalRaw(lineItems)),
    linkedOrders: linkedOrders.map((o) => ({
      customerOrderId: o.customerOrderId?.trim() || "",
      createDate: formatDate(o.createDate),
    })),
    lineItemCount: lineItems.length,
  };
}

function formatQuoteCustomer(row) {
  return {
    customerId: row.customerId?.trim() || "",
    name: row.customerName?.trim() || "",
    address1: row.address1?.trim() || "",
    address2: row.address2?.trim() || "",
    address3: row.address3?.trim() || "",
    city: row.city?.trim() || "",
    state: row.state?.trim() || "",
    zipCode: row.zipCode?.trim() || "",
    country: row.country?.trim() || "",
  };
}

function formatQuoteContact(row) {
  const firstName = row.contactFirstName?.trim() || "";
  const lastName = row.contactLastName?.trim() || "";
  const fullName = `${firstName} ${lastName}`.trim() || "N/A";

  return {
    firstName: firstName || null,
    lastName: lastName || null,
    fullName,
    position: row.contactPosition?.trim() || null,
    honorific: row.contactHonorific?.trim() || null,
    salutation: row.contactSalutation?.trim() || null,
    phone: row.contactPhone?.trim() || null,
    fax: row.contactFax?.trim() || null,
  };
}

function formatQuoteSalesRep(row) {
  if (!row.salesRepId) return null;
  return {
    id: row.salesRepId?.trim() || "",
    name: row.salesRepName?.trim() || row.salesRepId?.trim() || "N/A",
  };
}

function formatQuoteLineItem(row) {
  const lineTotal =
    (parseFloat(row.quantity) || 0) * (parseFloat(row.unitPrice) || 0);

  return {
    lineNumber: parseInt(row.lineNumber) || 0,
    description: row.description?.trim() || "",
    partId: row.partId?.trim() || null,
    customerPartId: row.customerPartId?.trim() || null,
    quantity: parseFloat(row.quantity) || 0,
    unitPrice: parseFloat(row.unitPrice) || 0,
    lineTotal,
    formattedUnitPrice: formatCurrency(row.unitPrice),
    formattedLineTotal: formatCurrency(lineTotal),
    sellingUm: row.sellingUm?.trim() || null,
    extendedDescription: row.extendedDescription || null,
  };
}

function calculateTotalRaw(lineItems) {
  return lineItems.reduce((sum, item) => {
    return (
      sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
    );
  }, 0);
}

function calculateTotal(lineItems) {
  return parseFloat(calculateTotalRaw(lineItems).toFixed(2));
}

module.exports = {
  formatQuoteDocument,
  formatQuoteLineItem,
  formatQuoteStatus,
};
