function formatOrderSummary(row) {
  return {
    jobNumber: row.jobNumber?.trim() || "",
    customerName: row.customerName?.trim() || "",
    orderDate: formatDate(row.orderDate),
    totalAmount: parseFloat(row.totalAmount) || 0,
    formattedTotal: formatCurrency(row.totalAmount, "USD"),
    customerPo: row.customerPo?.trim() || null,
  };
}

function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

function formatCurrency(amount, currency = "USD") {
  const value = parseFloat(amount) || 0;
  const symbol = currency === "USD" ? "$" : currency;
  return `${symbol}${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatOrderAcknowledgement(orderRow, lineItems) {
  return {
    orderId: orderRow.orderId?.trim() || "",
    orderDate: formatDate(orderRow.orderDate),
    promiseDate: formatDate(orderRow.promiseDate),
    customerPoRef: orderRow.customerPoRef?.trim() || null,
    totalAmount: parseFloat(orderRow.totalAmount) || 0,
    formattedTotal: formatCurrency(orderRow.totalAmount, orderRow.currencyId),
    currencyId: orderRow.currencyId?.trim() || "USD",
    termsDescription: orderRow.termsDescription?.trim() || "N/A",
    desiredShipDate: formatDate(orderRow.desiredShipDate),
    salesRep: formatSalesRep(orderRow),
    customer: formatCustomer(orderRow),
    contact: formatContact(orderRow),
    lineItems: lineItems.map(formatLineItem),
    lineItemCount: lineItems.length,
  };
}

function formatSalesRep(row) {
  if (!row.salesRepId) return null;
  return {
    id: row.salesRepId?.trim() || "",
    name: row.salesRepName?.trim() || row.salesRepId?.trim() || "N/A",
  };
}

function formatCustomer(row) {
  return {
    customerId: row.customerId?.trim() || "",
    name: row.customerName?.trim() || "",
    shipTo: {
      address1: row.address1?.trim() || "",
      address2: row.address2?.trim() || "",
      city: row.city?.trim() || "",
      state: row.state?.trim() || "",
      zipCode: row.zipCode?.trim() || "",
      country: row.country?.trim() || "",
    },
    billTo: {
      name: row.billToName?.trim() || row.customerName?.trim() || "",
      address1: row.billToAddress1?.trim() || "",
      address2: row.billToAddress2?.trim() || "",
      address3: row.billToAddress3?.trim() || "",
      city: row.billToCity?.trim() || "",
      state: row.billToState?.trim() || "",
      zipCode: row.billToZipCode?.trim() || "",
      country: row.billToCountry?.trim() || "",
    },
  };
}

function formatContact(row) {
  const firstName = row.contactFirstName?.trim() || "";
  const lastName = row.contactLastName?.trim() || "";
  const fullName = `${firstName} ${lastName}`.trim() || "N/A";

  return {
    firstName: firstName || null,
    lastName: lastName || null,
    fullName,
    phone: row.contactPhone?.trim() || null,
    fax: row.contactFax?.trim() || null,
  };
}

function formatLineItem(row) {
  return {
    lineNumber: parseInt(row.lineNumber) || 0,
    baseLotId: row.baseLotId?.trim() || null,
    partId: row.partId?.trim() || null,
    description: row.description?.trim() || "",
    quantity: parseFloat(row.quantity) || 0,
    unitPrice: parseFloat(row.unitPrice) || 0,
    lineTotal: parseFloat(row.lineTotal) || 0,
    formattedUnitPrice: formatCurrency(row.unitPrice),
    formattedLineTotal: formatCurrency(row.lineTotal),
    promiseDate: formatDate(row.promiseDate),
    extendedDescription: row.extendedDescription || null,
  };
}

module.exports = {
  formatOrderSummary,
  formatOrderAcknowledgement,
  formatLineItem,
  formatDate,
  formatCurrency,
};
