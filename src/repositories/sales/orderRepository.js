const { getPool, sql } = require("../../database");
const logger = require("../../utils/logger");

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
        co.SALES_TAX_GROUP_ID AS salesTaxGroupId,
        ISNULL((
          SELECT SUM(stp.TAX_PERCENT)
          FROM SLS_TAX_GRP_TAX sgt
          INNER JOIN SALES_TAX_PCT stp ON stp.SALES_TAX_ID = sgt.SALES_TAX_ID
            AND stp.EFFECTIVE_DATE = (
              SELECT MAX(stp2.EFFECTIVE_DATE) FROM SALES_TAX_PCT stp2
              WHERE stp2.SALES_TAX_ID = sgt.SALES_TAX_ID
                AND stp2.EFFECTIVE_DATE <= co.ORDER_DATE
            )
          WHERE sgt.SALES_TAX_GROUP_ID = co.SALES_TAX_GROUP_ID
        ), 0) AS combinedTaxPercent,
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
 * Extract base number from order ID for work order lookups.
 */
function extractBaseNumber(orderId) {
  if (orderId.includes(" ")) {
    return orderId.split(" ")[0];
  } else if (orderId.includes("-")) {
    return orderId.split("-")[0];
  } else {
    const match = orderId.match(/^(.+\d)R\d+$/);
    if (match) {
      return match[1];
    }
  }
  return orderId;
}

/**
 * Resolves LOT_ID mapping for customer order line items.
 *
 * Strategy 1 (primary): DEMAND_SUPPLY_LINK — the ERP's planning/allocation table.
 *   Created at order entry when work orders are generated. Maps DEMAND_SEQ_NO (line
 *   number) to SUPPLY_LOT_ID (work order lot). Covers 98.5% of all orders.
 *
 * Strategy 2 (fallback): WORK_ORDER + INVENTORY_TRANS — the ERP's execution table.
 *   Only populated when materials are physically moved (issued/received). Covers 92.6%
 *   of orders but misses unreleased, cancelled, and some closed orders where inventory
 *   transactions weren't tagged with the customer order reference.
 *
 * When both sources exist they always agree. DSL is primary because:
 *   - Higher coverage (98.5% vs 92.6%)
 *   - Available immediately at order creation (not dependent on manufacturing progress)
 *   - Canonical source of demand-to-supply relationships in the ERP
 *   - Always 1:1 mapping (one line → one lot, confirmed zero multi-lot cases)
 */
async function getLotIdMapping(pool, orderId, baseNumber) {
  const lotIdMap = new Map();

  // Strategy 1 (primary): DEMAND_SUPPLY_LINK
  try {
    const dslResult = await pool
      .request()
      .input("orderId", sql.VarChar, orderId).query(`
        SELECT
          dsl.DEMAND_SEQ_NO AS [lineNo],
          dsl.SUPPLY_LOT_ID AS [lotId]
        FROM DEMAND_SUPPLY_LINK dsl WITH (NOLOCK)
        WHERE dsl.DEMAND_BASE_ID = @orderId
          AND dsl.SUPPLY_TYPE = 'WO'
          AND dsl.DEMAND_TYPE = 'CO'
          AND dsl.DEMAND_SEQ_NO IS NOT NULL
          AND dsl.SUPPLY_LOT_ID IS NOT NULL
        ORDER BY dsl.DEMAND_SEQ_NO
      `);

    for (const row of dslResult.recordset) {
      const lineNo = row.lineNo;
      const lotId = row.lotId?.trim();
      if (lotId && !lotIdMap.has(lineNo)) {
        lotIdMap.set(lineNo, lotId);
      }
    }
  } catch (err) {
    logger.warn(
      "Could not fetch LOT_ID mapping from DEMAND_SUPPLY_LINK:",
      err.message,
    );
  }

  // Strategy 2 (fallback): WORK_ORDER + INVENTORY_TRANS
  // Only fires when DSL returns nothing (covers ~27 edge-case orders)
  if (lotIdMap.size === 0) {
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

      if (lotIdMap.size > 0) {
        logger.info("LOT_ID mapping resolved via INVENTORY_TRANS fallback", {
          orderId,
          mappedLines: lotIdMap.size,
        });
      }
    } catch (err) {
      logger.warn(
        "Could not fetch LOT_ID mapping from INVENTORY_TRANS:",
        err.message,
      );
    }
  }

  return lotIdMap;
}

async function getOrderLineItems(orderId) {
  const pool = await getPool();

  const baseNumber = extractBaseNumber(orderId);

  // Step 1: Get LOT_ID mapping (DSL primary, INVENTORY_TRANS fallback)
  const lotIdMap = await getLotIdMapping(pool, orderId, baseNumber);

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

async function getOrderLineItemsPaginated(orderId, limit = 50, offset = 0) {
  const pool = await getPool();

  const baseNumber = extractBaseNumber(orderId);

  // Step 1: Get LOT_ID mapping (DSL primary, INVENTORY_TRANS fallback)
  const lotIdMap = await getLotIdMapping(pool, orderId, baseNumber);

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
