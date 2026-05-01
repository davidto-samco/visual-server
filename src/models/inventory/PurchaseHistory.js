function formatDate(d) {
  if (d === null || d === undefined) return null;
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function trimString(v) {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

function toNumber(v) {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function buildVendorDisplay(vendorId, vendorName) {
  if (vendorId && vendorName) return `${vendorId} - ${vendorName}`;
  if (vendorId) return vendorId;
  if (vendorName) return vendorName;
  return "";
}

function formatPurchaseHistory(record) {
  const vendorId = trimString(record.vendorId);
  const vendorName = trimString(record.vendorName);
  return {
    ...record,
    orderDate: formatDate(record.orderDate),
    desiredRecvDate: formatDate(record.desiredRecvDate),
    promiseDate: formatDate(record.promiseDate),
    lastReceivedDate: formatDate(record.lastReceivedDate),
    purchaseOrder: trimString(record.purchaseOrder),
    lineNo: toNumber(record.lineNo),
    lineStatus: trimString(record.lineStatus),
    delSched: Boolean(record.delSched),
    vendorId,
    vendorName,
    vendorDisplay: buildVendorDisplay(vendorId, vendorName),
    orderQty: toNumber(record.orderQty),
    receivedQty: toNumber(record.receivedQty),
    currencyId: trimString(record.currencyId),
    currencyName: trimString(record.currencyName),
    unitPrice: toNumber(record.unitPrice),
    nativeCurrencyId: trimString(record.nativeCurrencyId),
    nativeCurrencyName: trimString(record.nativeCurrencyName),
    nativeUnitPrice: toNumber(record.nativeUnitPrice),
    discPercent: toNumber(record.discPercent),
    fixedCost: toNumber(record.fixedCost),
    standardUnitCost: toNumber(record.standardUnitCost),
  };
}

module.exports = { formatPurchaseHistory };
