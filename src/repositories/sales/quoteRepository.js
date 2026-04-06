const { getPool, sql } = require("../../database");

/**
 * Find quote header by quote ID.
 * Joins SALES_REP for rep name.
 */
async function findByQuoteId(quoteId) {
  const pool = await getPool();
  const result = await pool.request().input("quoteId", sql.VarChar, quoteId)
    .query(`
      SELECT
        q.ID AS quoteId,
        q.CUSTOMER_ID AS customerId,
        q.NAME AS customerName,
        q.ADDR_1 AS address1,
        q.ADDR_2 AS address2,
        q.ADDR_3 AS address3,
        q.CITY AS city,
        q.STATE AS state,
        q.ZIPCODE AS zipCode,
        q.COUNTRY AS country,
        q.CONTACT_FIRST_NAME AS contactFirstName,
        q.CONTACT_LAST_NAME AS contactLastName,
        q.CONTACT_INITIAL AS contactInitial,
        q.CONTACT_POSITION AS contactPosition,
        q.CONTACT_HONORIFIC AS contactHonorific,
        q.CONTACT_SALUTATION AS contactSalutation,
        q.CONTACT_PHONE AS contactPhone,
        q.CONTACT_FAX AS contactFax,
        q.SALESREP_ID AS salesRepId,
        sr.NAME AS salesRepName,
        q.STATUS AS status,
        q.QUOTE_DATE AS quoteDate,
        q.EXPIRATION_DATE AS expirationDate,
        q.FOLLOWUP_DATE AS followupDate,
        q.EXPECTED_WIN_DATE AS expectedWinDate,
        q.WIN_PROBABILITY AS winProbability,
        q.WON_LOSS_DATE AS wonLossDate,
        q.WON_LOSS_REASON AS wonLossReason,
        q.SHIP_VIA AS shipVia,
        q.FREE_ON_BOARD AS freeOnBoard,
        q.TERMS_DESCRIPTION AS termsDescription,
        q.FREIGHT_TERMS AS freightTerms,
        q.QUOTED_LEADTIME AS quotedLeadtime,
        q.CURRENCY_ID AS currencyId,
        q.PRINTED_DATE AS printedDate,
        q.USER_1 AS user1,
        q.USER_2 AS user2,
        q.USER_3 AS user3,
        q.USER_4 AS user4,
        q.USER_5 AS user5,
        q.USER_6 AS user6,
        q.USER_7 AS user7,
        q.USER_8 AS user8,
        q.USER_9 AS user9,
        q.USER_10 AS user10
      FROM QUOTE q WITH (NOLOCK)
      LEFT JOIN SALES_REP sr WITH (NOLOCK) ON q.SALESREP_ID = sr.ID
      WHERE q.ID = @quoteId
    `);

  return result.recordset.length > 0 ? result.recordset[0] : null;
}

/**
 * Check if a quote exists.
 */
async function exists(quoteId) {
  const pool = await getPool();
  const result = await pool.request().input("quoteId", sql.VarChar, quoteId)
    .query(`
      SELECT 1 AS exists_flag
      FROM QUOTE WITH (NOLOCK)
      WHERE ID = @quoteId
    `);

  return result.recordset.length > 0;
}

/**
 * Get the extended description for the quote header (the specification block).
 * Stored in QUOTE_BINARY with TYPE = 'D'.
 */
async function getQuoteDescription(quoteId) {
  const pool = await getPool();
  const result = await pool.request().input("quoteId", sql.VarChar, quoteId)
    .query(`
      SELECT
        CAST(CAST(BITS AS VARBINARY(MAX)) AS VARCHAR(MAX)) AS description
      FROM QUOTE_BINARY WITH (NOLOCK)
      WHERE QUOTE_ID = @quoteId
        AND RTRIM(TYPE) = 'D'
    `);

  return result.recordset.length > 0
    ? result.recordset[0].description || ""
    : "";
}

/**
 * Get all line items with pricing for a quote.
 * Joins QUOTE_LINE with QUOTE_PRICE for unit price and quantity.
 */
async function getLineItems(quoteId) {
  const pool = await getPool();
  const result = await pool.request().input("quoteId", sql.VarChar, quoteId)
    .query(`
      SELECT
        ql.LINE_NO AS lineNumber,
        ql.PART_ID AS partId,
        ql.DESCRIPTION AS description,
        ql.CUSTOMER_PART_ID AS customerPartId,
        ql.DRAWING_ID AS drawingId,
        ql.DRAWING_REV_NO AS drawingRevNo,
        ql.PRODUCT_CODE AS productCode,
        ql.USER_1 AS user1,
        ql.USER_2 AS user2,
        ql.USER_3 AS user3,
        ql.USER_4 AS user4,
        ql.USER_5 AS user5,
        ISNULL(qp.QTY, 0) AS quantity,
        ISNULL(qp.UNIT_PRICE, 0) AS unitPrice,
        qp.SELLING_UM AS sellingUm
      FROM QUOTE_LINE ql WITH (NOLOCK)
      LEFT JOIN QUOTE_PRICE qp WITH (NOLOCK)
        ON ql.QUOTE_ID = qp.QUOTE_ID
        AND ql.LINE_NO = qp.QUOTE_LINE_NO
      WHERE ql.QUOTE_ID = @quoteId
      ORDER BY ql.LINE_NO
    `);

  return result.recordset;
}

/**
 * Get extended descriptions for all line items.
 * Stored in QUOTE_LINE_BINARY with TYPE = 'D'.
 * Returns a Map of lineNumber -> description text.
 */
async function getLineDescriptions(quoteId) {
  const pool = await getPool();
  const result = await pool.request().input("quoteId", sql.VarChar, quoteId)
    .query(`
      SELECT
        QUOTE_LINE_NO AS lineNumber,
        CAST(CAST(BITS AS VARBINARY(MAX)) AS VARCHAR(MAX)) AS description
      FROM QUOTE_LINE_BINARY WITH (NOLOCK)
      WHERE QUOTE_ID = @quoteId
        AND RTRIM(TYPE) = 'D'
    `);

  const descMap = new Map();
  for (const row of result.recordset) {
    if (row.description) {
      descMap.set(row.lineNumber, row.description);
    }
  }
  return descMap;
}

/**
 * Get linked customer orders for a quote.
 */
async function getLinkedOrders(quoteId) {
  const pool = await getPool();
  const result = await pool.request().input("quoteId", sql.VarChar, quoteId)
    .query(`
      SELECT
        qo.CUST_ORDER_ID AS customerOrderId,
        qo.CREATE_DATE AS createDate
      FROM QUOTE_ORDER qo WITH (NOLOCK)
      WHERE qo.QUOTE_ID = @quoteId
      ORDER BY qo.CREATE_DATE
    `);

  return result.recordset;
}

module.exports = {
  findByQuoteId,
  exists,
  getQuoteDescription,
  getLineItems,
  getLineDescriptions,
  getLinkedOrders,
};
