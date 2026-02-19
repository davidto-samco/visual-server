// src/repositories/sales/orderRepository.js

const { getPool, sql } = require("../../database");

/**
 * Get recent orders (default view)
 *
 * @param {number} limit - Maximum results
 * @returns {Promise<Array>} Order summaries
 */
async function getRecentOrders(limit = 100) {
  const pool = await getPool();
  const result = await pool.request().input("limit", sql.Int, limit).query(`
      SELECT TOP (@limit)
        co.ID AS jobNumber,
        c.NAME AS customerName,
        co.ORDER_DATE AS orderDate,
        ISNULL(co.TOTAL_AMT_ORDERED, 0) AS totalAmount,
        co.CUSTOMER_PO_REF AS customerPo
      FROM CUSTOMER_ORDER co WITH (NOLOCK)
      INNER JOIN CUSTOMER c WITH (NOLOCK) ON co.CUSTOMER_ID = c.ID
      ORDER BY co.ORDER_DATE DESC
    `);

  return result.recordset;
}

/**
 * Search orders with combined filters
 */
async function searchWithFilters(
  customerName,
  startDate,
  endDate,
  limit = 100,
  offset = 0,
) {
  const pool = await getPool();
  const request = pool
    .request()
    .input("limit", sql.Int, limit)
    .input("offset", sql.Int, offset);

  const conditions = [];

  if (customerName) {
    request.input("customerName", sql.VarChar, `%${customerName}%`);
    conditions.push("c.NAME LIKE @customerName");
  }

  if (startDate) {
    request.input("startDate", sql.DateTime, startDate);
    conditions.push("co.ORDER_DATE >= @startDate");
  }

  if (endDate) {
    request.input("endDate", sql.DateTime, endDate);
    conditions.push("co.ORDER_DATE <= @endDate");
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await request.query(`
    SELECT
      co.ID AS jobNumber,
      c.NAME AS customerName,
      co.ORDER_DATE AS orderDate,
      ISNULL(co.TOTAL_AMT_ORDERED, 0) AS totalAmount,
      co.CUSTOMER_PO_REF AS customerPo
    FROM CUSTOMER_ORDER co WITH (NOLOCK)
    INNER JOIN CUSTOMER c WITH (NOLOCK) ON co.CUSTOMER_ID = c.ID
    ${whereClause}
    ORDER BY co.ORDER_DATE DESC
    OFFSET @offset ROWS
    FETCH NEXT @limit ROWS ONLY
  `);

  return result.recordset;
}

/**
 * Count orders with combined filters
 */
async function countWithFilters(customerName, startDate, endDate) {
  const pool = await getPool();
  const request = pool.request();

  const conditions = [];

  if (customerName) {
    request.input("customerName", sql.VarChar, `%${customerName}%`);
    conditions.push("c.NAME LIKE @customerName");
  }

  if (startDate) {
    request.input("startDate", sql.DateTime, startDate);
    conditions.push("co.ORDER_DATE >= @startDate");
  }

  if (endDate) {
    request.input("endDate", sql.DateTime, endDate);
    conditions.push("co.ORDER_DATE <= @endDate");
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const result = await request.query(`
    SELECT COUNT(*) AS total
    FROM CUSTOMER_ORDER co WITH (NOLOCK)
    INNER JOIN CUSTOMER c WITH (NOLOCK) ON co.CUSTOMER_ID = c.ID
    ${whereClause}
  `);

  return result.recordset[0].total;
}

/**
 * Check if order exists
 *
 * @param {string} jobNumber - Job number
 * @returns {Promise<boolean>}
 */
async function exists(jobNumber) {
  const pool = await getPool();
  const result = await pool.request().input("jobNumber", sql.VarChar, jobNumber)
    .query(`
      SELECT 1 AS exists_flag 
      FROM CUSTOMER_ORDER WITH (NOLOCK) 
      WHERE ID = @jobNumber
    `);

  return result.recordset.length > 0;
}

/**
 * Get complete order by job number with customer details
 *
 * @param {string} jobNumber - Job number / Order ID
 * @returns {Promise<Object|null>} Order header or null
 */
async function findByJobNumber(jobNumber) {
  const pool = await getPool();
  const result = await pool.request().input("jobNumber", sql.VarChar, jobNumber)
    .query(`
      SELECT
        co.ID AS orderId,
        co.ORDER_DATE AS orderDate,
        co.CUSTOMER_PO_REF AS customerPoRef,
        co.CONTACT_FIRST_NAME AS contactFirstName,
        co.CONTACT_LAST_NAME AS contactLastName,
        co.CONTACT_PHONE AS contactPhone,
        co.CONTACT_FAX AS contactFax,
        co.PROMISE_DATE AS promiseDate,
        ISNULL(co.TOTAL_AMT_ORDERED, 0) AS totalAmount,
        co.CURRENCY_ID AS currencyId,
        co.TERMS_DESCRIPTION AS termsDescription,
        co.SALESREP_ID AS salesRepId,
        sr.NAME AS salesRepName,
        co.DESIRED_SHIP_DATE AS desiredShipDate,
        co.USER_10 AS quoteId,
        co.USER_6 AS revisionDate,
        co.USER_7 AS revisionNumber,
        c.ID AS customerId,
        c.NAME AS customerName,
        c.ADDR_1 AS address1,
        c.ADDR_2 AS address2,
        c.CITY AS city,
        c.STATE AS state,
        c.ZIPCODE AS zipCode,
        c.COUNTRY AS country,
        c.BILL_TO_NAME AS billToName,
        c.BILL_TO_ADDR_1 AS billToAddress1,
        c.BILL_TO_ADDR_2 AS billToAddress2,
        c.BILL_TO_ADDR_3 AS billToAddress3,
        c.BILL_TO_CITY AS billToCity,
        c.BILL_TO_STATE AS billToState,
        c.BILL_TO_ZIPCODE AS billToZipCode,
        c.BILL_TO_COUNTRY AS billToCountry
      FROM CUSTOMER_ORDER co WITH (NOLOCK)
      INNER JOIN CUSTOMER c WITH (NOLOCK) ON co.CUSTOMER_ID = c.ID
      LEFT JOIN SALES_REP sr WITH (NOLOCK) ON co.SALESREP_ID = sr.ID
      WHERE co.ID = @jobNumber
    `);

  return result.recordset.length > 0 ? result.recordset[0] : null;
}

/**
 * Get order line items
 *
 * @param {string} orderId - Order ID
 * @returns {Promise<Array>} Line items
 */
/**
 * Get order line items with LOT_ID from INVENTORY_TRANS mapping
 * Returns RAW data - formatting done in service/model layer
 */
async function getOrderLineItems(orderId) {
  const pool = await getPool();

  // Extract base number from order ID
  let baseNumber = orderId;
  if (orderId.includes(" ")) {
    baseNumber = orderId.split(" ")[0];
  } else if (orderId.includes("-")) {
    baseNumber = orderId.split("-")[0];
  } else {
    const match = orderId.match(/^(.+\d)R\d+$/);
    if (match) {
      baseNumber = match[1];
    }
  }

  // Step 1: Get LOT_ID mapping from WORK_ORDER + INVENTORY_TRANS
  const lotIdMap = new Map();
  try {
    const lotResult = await pool
      .request()
      .input("baseNumber", sql.VarChar, baseNumber)
      .input("orderId", sql.VarChar, orderId).query(`
        SELECT DISTINCT
          wo.LOT_ID AS [lotId],
          it.CUST_ORDER_LINE_NO AS [lineNo]
        FROM WORK_ORDER wo 
        INNER JOIN INVENTORY_TRANS it
          ON wo.BASE_ID = it.WORKORDER_BASE_ID
          AND wo.LOT_ID = it.WORKORDER_LOT_ID
        WHERE wo.BASE_ID = @baseNumber
          AND it.CUST_ORDER_ID = @orderId
          AND wo.LOT_ID NOT LIKE '%W'
          AND it.CUST_ORDER_LINE_NO IS NOT NULL
        ORDER BY it.CUST_ORDER_LINE_NO, wo.LOT_ID
      `);

    for (const row of lotResult.recordset) {
      const lineNo = row.lineNo;
      const lotId = row.lotId?.trim();
      if (lotId && !lotIdMap.has(lineNo)) {
        lotIdMap.set(lineNo, lotId);
      }
    }
  } catch (err) {
    console.warn("Could not fetch LOT_ID mapping:", err.message);
  }

  // Step 2: Get line items
  const lineResult = await pool.request().input("orderId", sql.VarChar, orderId)
    .query(`
      SELECT
        LINE_NO AS lineNumber,
        CUST_ORDER_ID AS orderId,
        PART_ID AS partId,
        ISNULL(ORDER_QTY, 0) AS quantity,
        ISNULL(UNIT_PRICE, 0) AS unitPrice,
        ISNULL(TOTAL_AMT_ORDERED, 0) AS lineTotal,
        MISC_REFERENCE AS description,
        PROMISE_DATE AS promiseDate
      FROM CUST_ORDER_LINE WITH (NOLOCK)
      WHERE CUST_ORDER_ID = @orderId
      ORDER BY LINE_NO
    `);

  // Step 3: Get binary text for all lines
  const binaryResult = await pool
    .request()
    .input("orderId", sql.VarChar, orderId).query(`
      SELECT
        CUST_ORDER_LINE_NO AS lineNumber,
        CAST(CAST(BITS AS VARBINARY(MAX)) AS VARCHAR(MAX)) AS binaryText
      FROM CUST_LINE_BINARY WITH (NOLOCK)
      WHERE CUST_ORDER_ID = @orderId
        AND RTRIM(TYPE) = 'D'
    `);

  const binaryTextMap = new Map();
  for (const row of binaryResult.recordset) {
    if (row.binaryText) {
      binaryTextMap.set(row.lineNumber, row.binaryText);
    }
  }

  // Step 4: Return raw data with lotId attached
  return lineResult.recordset.map((row) => {
    const lineNumber = row.lineNumber;
    const lotId = lotIdMap.get(lineNumber);

    return {
      ...row,
      baseLotId: lotId ? `${orderId}/${lotId}` : null,
      extendedDescription: binaryTextMap.get(lineNumber) || null,
    };
  });
}

/**
 * Get order line items with pagination
 *
 * @param {string} orderId - Order ID
 * @param {number} limit - Results per page
 * @param {number} offset - Offset
 * @returns {Promise<Array>} Line items
 */
async function getOrderLineItemsPaginated(orderId, limit = 50, offset = 0) {
  const pool = await getPool();

  // Extract base number from order ID
  let baseNumber = orderId;
  if (orderId.includes(" ")) {
    baseNumber = orderId.split(" ")[0];
  } else if (orderId.includes("-")) {
    baseNumber = orderId.split("-")[0];
  } else {
    const match = orderId.match(/^(.+\d)R\d+$/);
    if (match) {
      baseNumber = match[1];
    }
  }

  // Step 1: Get LOT_ID mapping from WORK_ORDER + INVENTORY_TRANS
  const lotIdMap = new Map();
  try {
    const lotResult = await pool
      .request()
      .input("baseNumber", sql.VarChar, baseNumber)
      .input("orderId", sql.VarChar, orderId).query(`
        SELECT DISTINCT
          wo.LOT_ID AS [lotId],
          it.CUST_ORDER_LINE_NO AS [lineNo]
        FROM WORK_ORDER wo
        INNER JOIN INVENTORY_TRANS it
          ON wo.BASE_ID = it.WORKORDER_BASE_ID
          AND wo.LOT_ID = it.WORKORDER_LOT_ID
        WHERE wo.BASE_ID = @baseNumber
          AND it.CUST_ORDER_ID = @orderId
          AND wo.LOT_ID NOT LIKE '%W'
          AND it.CUST_ORDER_LINE_NO IS NOT NULL
        ORDER BY it.CUST_ORDER_LINE_NO, wo.LOT_ID
      `);

    for (const row of lotResult.recordset) {
      const lineNo = row.lineNo;
      const lotId = row.lotId?.trim();
      if (lotId && !lotIdMap.has(lineNo)) {
        lotIdMap.set(lineNo, lotId);
      }
    }
  } catch (err) {
    console.warn("Could not fetch LOT_ID mapping:", err.message);
  }

  // Step 2: Get paginated line items
  const lineResult = await pool
    .request()
    .input("orderId", sql.VarChar, orderId)
    .input("limit", sql.Int, limit)
    .input("offset", sql.Int, offset).query(`
      SELECT
        LINE_NO AS [lineNumber],
        CUST_ORDER_ID AS [orderId],
        PART_ID AS [partId],
        ISNULL(ORDER_QTY, 0) AS [quantity],
        ISNULL(UNIT_PRICE, 0) AS [unitPrice],
        ISNULL(TOTAL_AMT_ORDERED, 0) AS [lineTotal],
        MISC_REFERENCE AS [description],
        PROMISE_DATE AS [promiseDate]
      FROM CUST_ORDER_LINE WITH (NOLOCK)
      WHERE CUST_ORDER_ID = @orderId
      ORDER BY LINE_NO
      OFFSET @offset ROWS
      FETCH NEXT @limit ROWS ONLY
    `);

  // Step 3: Get binary text for the fetched lines only
  const lineNumbers = lineResult.recordset.map((r) => r.lineNumber);
  const binaryTextMap = new Map();

  if (lineNumbers.length > 0) {
    const binaryResult = await pool
      .request()
      .input("orderId", sql.VarChar, orderId).query(`
        SELECT
          CUST_ORDER_LINE_NO AS [lineNumber],
          CAST(CAST(BITS AS VARBINARY(MAX)) AS VARCHAR(MAX)) AS [binaryText]
        FROM CUST_LINE_BINARY WITH (NOLOCK)
        WHERE CUST_ORDER_ID = @orderId
          AND RTRIM(TYPE) = 'D'
      `);

    for (const row of binaryResult.recordset) {
      if (row.binaryText && lineNumbers.includes(row.lineNumber)) {
        binaryTextMap.set(row.lineNumber, row.binaryText);
      }
    }
  }

  // Step 4: Return raw data with lotId attached
  return lineResult.recordset.map((row) => {
    const lineNumber = row.lineNumber;
    const lotId = lotIdMap.get(lineNumber);

    return {
      ...row,
      baseLotId: lotId ? `${orderId}/${lotId}` : null,
      extendedDescription: binaryTextMap.get(lineNumber) || null,
    };
  });
}

/**
 * Count line items for an order
 *
 * @param {string} orderId - Order ID
 * @returns {Promise<number>} Count
 */
async function countLineItems(orderId) {
  const pool = await getPool();
  const result = await pool.request().input("orderId", sql.VarChar, orderId)
    .query(`
      SELECT COUNT(*) AS total
      FROM CUST_ORDER_LINE WITH (NOLOCK)
      WHERE CUST_ORDER_ID = @orderId
    `);

  return result.recordset[0].total;
}

/**
 * Get extended description for order line item from binary table
 *
 * @param {string} orderId - Order ID
 * @param {number} lineNo - Line number
 * @returns {Promise<string|null>} Extended description or null
 */
async function getLineExtendedDescription(orderId, lineNo) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("orderId", sql.VarChar, orderId)
    .input("lineNo", sql.SmallInt, lineNo).query(`
      SELECT CAST(CAST(BITS AS VARBINARY(MAX)) AS VARCHAR(MAX)) AS binaryText
      FROM CUST_LINE_BINARY WITH (NOLOCK)
      WHERE CUST_ORDER_ID = @orderId
        AND CUST_ORDER_LINE_NO = @lineNo
        AND RTRIM(TYPE) = 'D'
    `);

  return result.recordset.length > 0 ? result.recordset[0].binaryText : null;
}

module.exports = {
  getRecentOrders,
  searchWithFilters,
  countWithFilters,
  exists,
  findByJobNumber,
  getOrderLineItems,
  getOrderLineItemsPaginated,
  countLineItems,
  getLineExtendedDescription,
};
