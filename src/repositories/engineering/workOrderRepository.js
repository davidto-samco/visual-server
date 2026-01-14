const { getPool, sql } = require("../../database");

async function search(baseIdPattern, limit = 100) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("pattern", sql.VarChar, `${baseIdPattern}%`)
    .input("limit", sql.Int, limit).query(`
      SELECT TOP (@limit)
        wo.BASE_ID AS baseId, wo.LOT_ID AS lotId, wo.SUB_ID AS subId,
        wo.PART_ID AS partId, p.DESCRIPTION AS partDescription,
        ISNULL(wo.DESIRED_QTY, 0) AS orderQty, wo.TYPE AS type, wo.STATUS AS status,
        wo.SCHED_START_DATE AS startDate, wo.CLOSE_DATE AS closeDate,
        wo.CREATE_DATE AS createdDate
      FROM WORK_ORDER wo WITH (NOLOCK)
      LEFT JOIN PART p WITH (NOLOCK) ON wo.PART_ID = p.ID
      WHERE wo.BASE_ID LIKE @pattern
        AND wo.SUB_ID = '0'
      ORDER BY wo.CREATE_DATE DESC
    `);
  return result.recordset;
}

async function findByCompositeKey(baseId, lotId, subId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("baseId", sql.VarChar, baseId)
    .input("lotId", sql.VarChar, lotId)
    .input("subId", sql.VarChar, subId).query(`
      SELECT
        wo.BASE_ID AS baseId, wo.LOT_ID AS lotId, wo.SUB_ID AS subId,
        wo.PART_ID AS partId, p.DESCRIPTION AS partDescription,
        p.STOCK_UM AS unitOfMeasure,
        ISNULL(wo.DESIRED_QTY, 0) AS orderQty, wo.TYPE AS type, wo.STATUS AS status,
        wo.SCHED_START_DATE AS startDate, wo.SCHED_FINISH_DATE AS finishDate,
        wo.CLOSE_DATE AS closeDate, wo.CREATE_DATE AS createdDate,
        CAST(CAST(wb.BITS AS VARBINARY(MAX)) AS VARCHAR(MAX)) AS notes
      FROM WORK_ORDER wo WITH (NOLOCK)
      LEFT JOIN PART p WITH (NOLOCK) ON wo.PART_ID = p.ID
      LEFT JOIN WORKORDER_BINARY wb WITH (NOLOCK)
        ON wo.BASE_ID = wb.WORKORDER_BASE_ID
        AND wo.LOT_ID = wb.WORKORDER_LOT_ID
        AND wo.SUB_ID = wb.WORKORDER_SUB_ID
      WHERE wo.BASE_ID = @baseId AND wo.LOT_ID = @lotId AND wo.SUB_ID = @subId
    `);
  return result.recordset.length > 0 ? result.recordset[0] : null;
}

async function getAggregateCounts(baseId, lotId, subId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("baseId", sql.VarChar, baseId)
    .input("lotId", sql.VarChar, lotId)
    .input("subId", sql.VarChar, subId).query(`
      SELECT
        (SELECT COUNT(*) FROM OPERATION WITH (NOLOCK) 
         WHERE WORKORDER_BASE_ID = @baseId AND WORKORDER_LOT_ID = @lotId AND WORKORDER_SUB_ID = @subId) AS operations,
        (SELECT COUNT(*) FROM LABOR_TICKET WITH (NOLOCK) 
         WHERE WORKORDER_BASE_ID = @baseId AND WORKORDER_LOT_ID = @lotId AND WORKORDER_SUB_ID = @subId) AS laborTickets,
        (SELECT COUNT(*) FROM INVENTORY_TRANS WITH (NOLOCK) 
         WHERE WORKORDER_BASE_ID = @baseId AND WORKORDER_LOT_ID = @lotId AND WORKORDER_SUB_ID = @subId) AS inventoryTrans
    `);
  return result.recordset[0];
}

async function getOperations(baseId, lotId, subId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("baseId", sql.VarChar, baseId)
    .input("lotId", sql.VarChar, lotId)
    .input("subId", sql.VarChar, subId).query(`
      SELECT
        op.SEQUENCE_NO AS sequence,
        op.RESOURCE_ID AS resourceId,
        op.OPERATION_TYPE AS operationType,
        ISNULL(op.SETUP_HRS, 0) AS setupHrs,
        ISNULL(op.RUN, 0) AS runHrs,
        op.RUN_TYPE AS runType,
        op.STATUS AS status,
        ISNULL(op.CALC_START_QTY, 0) AS calcStartQty,
        op.CLOSE_DATE AS closeDate,
        CAST(CAST(ob.BITS AS VARBINARY(MAX)) AS VARCHAR(MAX)) AS notes,
        (SELECT COUNT(*) FROM REQUIREMENT r WITH (NOLOCK) 
         WHERE r.WORKORDER_BASE_ID = @baseId AND r.WORKORDER_LOT_ID = @lotId 
           AND r.WORKORDER_SUB_ID = @subId AND r.OPERATION_SEQ_NO = op.SEQUENCE_NO) AS requirementCount
      FROM OPERATION op WITH (NOLOCK)
      LEFT JOIN OPERATION_BINARY ob WITH (NOLOCK)
        ON op.WORKORDER_BASE_ID = ob.WORKORDER_BASE_ID
        AND op.WORKORDER_LOT_ID = ob.WORKORDER_LOT_ID
        AND op.WORKORDER_SUB_ID = ob.WORKORDER_SUB_ID
        AND op.SEQUENCE_NO = ob.SEQUENCE_NO
      WHERE op.WORKORDER_BASE_ID = @baseId AND op.WORKORDER_LOT_ID = @lotId AND op.WORKORDER_SUB_ID = @subId
      ORDER BY op.SEQUENCE_NO
    `);
  return result.recordset;
}

async function getRequirements(baseId, lotId, subId, operationSeq) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("baseId", sql.VarChar, baseId)
    .input("lotId", sql.VarChar, lotId)
    .input("subId", sql.VarChar, subId)
    .input("operationSeq", sql.SmallInt, operationSeq).query(`
      SELECT
        r.OPERATION_SEQ_NO AS operationSeqNo, r.PART_ID AS partId,
        p.DESCRIPTION AS partDescription, p.STOCK_UM AS unitOfMeasure,
        ISNULL(r.QTY_PER, 0) AS qtyPer, ISNULL(r.FIXED_QTY, 0) AS fixedQty,
        ISNULL(r.SCRAP_PERCENT, 0) AS scrapPercent, r.PIECE_NO AS pieceNo,
        r.SUBORD_WO_SUB_ID AS subordWoSubId,
        wo.STATUS AS subordWoStatus,
        wo.DESIRED_QTY AS subordWoQty,
        CAST(CAST(rb.BITS AS VARBINARY(MAX)) AS VARCHAR(MAX)) AS notes
      FROM REQUIREMENT r WITH (NOLOCK)
      LEFT JOIN PART p WITH (NOLOCK) ON r.PART_ID = p.ID
      LEFT JOIN WORK_ORDER wo WITH (NOLOCK)
        ON r.WORKORDER_BASE_ID = wo.BASE_ID
        AND r.WORKORDER_LOT_ID = wo.LOT_ID
        AND r.SUBORD_WO_SUB_ID = wo.SUB_ID
      LEFT JOIN REQUIREMENT_BINARY rb WITH (NOLOCK)
        ON r.WORKORDER_BASE_ID = rb.WORKORDER_BASE_ID
        AND r.WORKORDER_LOT_ID = rb.WORKORDER_LOT_ID
        AND r.WORKORDER_SUB_ID = rb.WORKORDER_SUB_ID
        AND r.OPERATION_SEQ_NO = rb.OPERATION_SEQ_NO
        AND r.PIECE_NO = rb.PIECE_NO
      WHERE r.WORKORDER_BASE_ID = @baseId AND r.WORKORDER_LOT_ID = @lotId 
        AND r.WORKORDER_SUB_ID = @subId AND r.OPERATION_SEQ_NO = @operationSeq
      ORDER BY r.PIECE_NO, r.PART_ID
    `);
  return result.recordset;
}

async function getSubWorkOrders(baseId, lotId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("baseId", sql.VarChar, baseId)
    .input("lotId", sql.VarChar, lotId).query(`
      SELECT
        wo.BASE_ID AS baseId, wo.LOT_ID AS lotId, wo.SUB_ID AS subId,
        wo.PART_ID AS partId, p.DESCRIPTION AS partDescription,
        ISNULL(wo.DESIRED_QTY, 0) AS orderQty, wo.TYPE AS type, wo.STATUS AS status,
        wo.SCHED_START_DATE AS startDate, wo.SCHED_FINISH_DATE AS finishDate,
        wo.CLOSE_DATE AS closeDate
      FROM WORK_ORDER wo WITH (NOLOCK)
      LEFT JOIN PART p WITH (NOLOCK) ON wo.PART_ID = p.ID
      WHERE wo.BASE_ID = @baseId AND wo.LOT_ID = @lotId 
        AND wo.SUB_ID != '' AND wo.SUB_ID != '0'
      ORDER BY wo.SUB_ID
    `);
  return result.recordset;
}

async function getWipBalance(baseId, lotId, subId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("baseId", sql.VarChar, baseId)
    .input("lotId", sql.VarChar, lotId)
    .input("subId", sql.VarChar, subId).query(`
      SELECT
        ISNULL(MATERIAL_AMOUNT, 0) AS materialCost,
        ISNULL(LABOR_AMOUNT, 0) AS laborCost,
        ISNULL(BURDEN_AMOUNT, 0) AS burdenCost,
        ISNULL(MATERIAL_AMOUNT, 0) + ISNULL(LABOR_AMOUNT, 0) + ISNULL(BURDEN_AMOUNT, 0) AS totalCost,
        POSTING_DATE AS postingDate
      FROM WIP_BALANCE WITH (NOLOCK)
      WHERE WORKORDER_BASE_ID = @baseId
        AND WORKORDER_LOT_ID = @lotId
        AND WORKORDER_SUB_ID = @subId
    `);
  return result.recordset.length > 0 ? result.recordset[0] : null;
}

module.exports = {
  search,
  findByCompositeKey,
  getAggregateCounts,
  getOperations,
  getRequirements,
  getSubWorkOrders,
  getWipBalance,
};
