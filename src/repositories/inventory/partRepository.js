const { getPool, sql } = require("../../database");

async function findById(partId) {
  const pool = await getPool();
  const result = await pool.request().input("partId", sql.VarChar, partId)
    .query(`
        SELECT
            p.ID as id,
            p.DESCRIPTION AS description,
            p.STOCK_UM as unitOfMeasure,
            p.PURCHASED AS purchased,
            p.FABRICATED AS fabricated,
            CASE
                WHEN p.FABRICATED = 'Y' AND ISNULL(p.PURCHASED, 'N') != 'Y' THEN 'Manufactured'
                WHEN p.PURCHASED = 'Y' THEN 'Purchased'
                ELSE 'Other'
            END AS partType,
            p.COMMODITY_CODE as commodityCode,
            p.DRAWING_ID AS drawingNumber,
            p.DRAWING_REV_NO AS drawingRevision,
            ISNULL(p.UNIT_MATERIAL_COST, 0) AS unitMaterialCost,
            ISNULL(p.UNIT_LABOR_COST, 0) AS unitLaborCost,
            ISNULL(p.UNIT_BURDEN_COST, 0) AS unitBurdenCost,
            ISNULL(p.UNIT_SERVICE_COST, 0) AS unitServiceCost,
            ISNULL(p.UNIT_MATERIAL_COST, 0) + ISNULL(p.UNIT_LABOR_COST, 0) + 
                ISNULL(p.UNIT_BURDEN_COST, 0) + ISNULL(p.UNIT_SERVICE_COST, 0) AS totalUnitCost,
            p.QTY_ON_HAND AS qtyOnHand,
            p.QTY_AVAILABLE_ISS AS qtyAvailable
        FROM PART p WITH (NOLOCK)
        WHERE p.ID = @partId
    `);
  return result.recordset.length > 0 ? result.recordset[0] : null;
}

async function exists(partId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("partId", sql.VarChar, partId)
    .query("SELECT 1 FROM PART WITH (NOLOCK) WHERE ID = @partId");
  return result.recordset.length > 0;
}

async function searchByPartNumber(partNumber, limit = 50, offset = 0) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("partNumber", sql.VarChar, `${partNumber}%`)
    .input("limit", sql.Int, limit)
    .input("offset", sql.Int, offset).query(`
      SELECT
        p.ID AS id,
        p.DESCRIPTION AS description,
        p.STOCK_UM AS unitOfMeasure,
        CASE 
          WHEN p.FABRICATED = 'Y' AND ISNULL(p.PURCHASED, 'N') != 'Y' THEN 'Manufactured'
          WHEN p.PURCHASED = 'Y' THEN 'Purchased'
          ELSE 'Other'
        END AS partType
      FROM PART p WITH (NOLOCK)
      WHERE p.ID LIKE @partNumber
      ORDER BY p.ID
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
  return result.recordset;
}

async function countByPartNumber(partNumber) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("partNumber", sql.VarChar, `${partNumber}%`)
    .query(
      "SELECT COUNT(*) AS total FROM PART WITH (NOLOCK) WHERE ID LIKE @partNumber",
    );
  return result.recordset[0].total;
}

async function getWhereUsed(partId, limit, offset) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("partId", sql.VarChar, partId)
    .input("limit", sql.Int, limit)
    .input("offset", sql.Int, offset).query(`
      SELECT
          wo.TYPE AS workOrderType,
          wo.BASE_ID AS baseId,
          wo.LOT_ID AS lotId,
          wo.SUB_ID AS subId,
          CASE WHEN wo.TYPE = 'M' THEN wo.BASE_ID END AS manufacturedPartId,
          CASE WHEN wo.TYPE = 'M' THEN mfg.DESCRIPTION END AS manufacturedPartDescription,
          r.OPERATION_SEQ_NO AS seqNo,
          ISNULL(r.PIECE_NO, 0) AS pieceNo,
          ISNULL(r.QTY_PER, 0) AS qtyPer,
          ISNULL(r.SCRAP_PERCENT, 0) AS scrapPercent,
          ISNULL(r.FIXED_QTY, 0) AS fixedQty,
          comp.STOCK_UM AS unitOfMeasure
      FROM REQUIREMENT r WITH (NOLOCK)
      INNER JOIN WORK_ORDER wo WITH (NOLOCK) 
          ON r.WORKORDER_TYPE = wo.TYPE
          AND r.WORKORDER_BASE_ID = wo.BASE_ID
          AND r.WORKORDER_LOT_ID = wo.LOT_ID
          AND r.WORKORDER_SPLIT_ID = wo.SPLIT_ID
          AND r.WORKORDER_SUB_ID = wo.SUB_ID
      LEFT JOIN PART mfg WITH (NOLOCK) ON wo.TYPE = 'M' AND wo.BASE_ID = mfg.ID
      LEFT JOIN PART comp WITH (NOLOCK) ON r.PART_ID = comp.ID
      WHERE r.PART_ID = @partId
      ORDER BY wo.TYPE, wo.BASE_ID, r.OPERATION_SEQ_NO
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
    `);
  return result.recordset;
}

async function countWhereUsed(partId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("partId", sql.VarChar, partId)
    .query(
      "SELECT COUNT(*) AS total FROM REQUIREMENT WITH (NOLOCK) WHERE PART_ID = @partId",
    );
  return result.recordset[0].total;
}

async function getExtendedDescription(partId) {
  const pool = await getPool();
  const result = await pool.request().input("partId", sql.VarChar, partId)
    .query(`
      SELECT CONVERT(VARCHAR(MAX), CAST(BITS AS VARBINARY(MAX))) AS extendedDescription
      FROM PART_BINARY WITH (NOLOCK)
      WHERE PART_ID = @partId AND TYPE = 'D'
    `);
  return result.recordset.length > 0
    ? result.recordset[0].extendedDescription
    : null;
}

async function getPurchaseHistory(partId) {
  const pool = await getPool();
  const result = await pool.request().input("partId", sql.VarChar, partId)
    .query(`
      SELECT
        po.ORDER_DATE                 AS [orderDate],
        COALESCE(pol.DESIRED_RECV_DATE, po.DESIRED_RECV_DATE) AS [desiredRecvDate],
        pol.PROMISE_DATE              AS [promiseDate],
        pol.LAST_RECEIVED_DATE        AS [lastReceivedDate],
        pol.PURC_ORDER_ID             AS [purchaseOrder],
        pol.LINE_NO                   AS [lineNo],
        pol.LINE_STATUS               AS [lineStatus],
        CAST(CASE WHEN ISNULL(ds.schedCount, 0) > 1 THEN 1 ELSE 0 END AS BIT) AS [delSched],
        po.VENDOR_ID                  AS [vendorId],
        v.NAME                        AS [vendorName],
        ISNULL(pol.ORDER_QTY, 0)          AS [orderQty],
        ISNULL(pol.TOTAL_RECEIVED_QTY, 0) AS [receivedQty],
        po.CURRENCY_ID                AS [currencyId],
        c.NAME                        AS [currencyName],
        ISNULL(pol.UNIT_PRICE, 0)     AS [unitPrice],
        nc.ID                         AS [nativeCurrencyId],
        nc.NAME                       AS [nativeCurrencyName],
        CASE
          WHEN po.CURRENCY_ID = nc.ID            THEN ISNULL(pol.UNIT_PRICE, 0)
          WHEN ISNULL(po.BUY_RATE, 0) = 0        THEN ISNULL(pol.UNIT_PRICE, 0)
          ELSE ISNULL(pol.UNIT_PRICE, 0) * po.BUY_RATE
        END                           AS [nativeUnitPrice],
        ISNULL(pol.TRADE_DISC_PERCENT, 0) AS [discPercent],
        ISNULL(pol.FIXED_CHARGE, 0)       AS [fixedCost],
        ISNULL(p.UNIT_MATERIAL_COST, 0)   AS [standardUnitCost]
      FROM PURC_ORDER_LINE pol WITH (NOLOCK)
      INNER JOIN PURCHASE_ORDER po WITH (NOLOCK) ON pol.PURC_ORDER_ID = po.ID
      LEFT JOIN  VENDOR         v  WITH (NOLOCK) ON po.VENDOR_ID = v.ID
      LEFT JOIN  CURRENCY       c  WITH (NOLOCK) ON po.CURRENCY_ID = c.ID
      LEFT JOIN  PART           p  WITH (NOLOCK) ON pol.PART_ID = p.ID
      LEFT JOIN  CURRENCY       nc WITH (NOLOCK) ON nc.TRACKING_CURRENCY = 'Y'
      LEFT JOIN (
        SELECT PURC_ORDER_ID, PURC_ORDER_LINE_NO, COUNT(*) AS schedCount
        FROM PURC_LINE_DEL WITH (NOLOCK)
        GROUP BY PURC_ORDER_ID, PURC_ORDER_LINE_NO
      ) ds ON ds.PURC_ORDER_ID      = pol.PURC_ORDER_ID
          AND ds.PURC_ORDER_LINE_NO = pol.LINE_NO
      WHERE pol.PART_ID = @partId
      ORDER BY po.ORDER_DATE DESC, pol.PURC_ORDER_ID DESC, pol.LINE_NO
    `);
  return result.recordset;
}

module.exports = {
  findById,
  searchByPartNumber,
  countByPartNumber,
  exists,
  getWhereUsed,
  countWhereUsed,
  getPurchaseHistory,
  getExtendedDescription,
};
