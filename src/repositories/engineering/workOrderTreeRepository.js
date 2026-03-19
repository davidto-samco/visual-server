const { getPool, sql } = require("../../database");

/**
 * Simplified tree: fetch work orders + parent-child links as flat data.
 * Tree assembly happens in the service layer (JavaScript), not SQL.
 *
 * Performance: Two simple indexed queries (~50ms total) replace the
 * recursive CTE that took 30-40s on large BOMs like 8113/26 (349 WOs).
 */
async function getSimplifiedTree(baseId, lotId) {
  const pool = await getPool();

  // Query 1: All work orders for this BASE_ID/LOT_ID
  const woResult = await pool
    .request()
    .input("baseId", sql.VarChar, baseId)
    .input("lotId", sql.VarChar, lotId).query(`
      SELECT
        wo.SUB_ID AS subId,
        wo.PART_ID AS partId,
        p.DESCRIPTION AS partDescription,
        ISNULL(wo.DESIRED_QTY, 0) AS orderQty,
        wo.STATUS AS status,
        wo.TYPE AS type,
        wo.SCHED_START_DATE AS startDate,
        wo.SCHED_FINISH_DATE AS finishDate,
        wo.CLOSE_DATE AS closeDate
      FROM WORK_ORDER wo WITH (NOLOCK)
      LEFT JOIN PART p WITH (NOLOCK) ON wo.PART_ID = p.ID
      WHERE wo.BASE_ID = @baseId AND wo.LOT_ID = @lotId
    `);

  if (woResult.recordset.length === 0) {
    return { workOrders: [], relationships: [] };
  }

  // Query 2: Parent-child relationships with sort order
  // ORDER BY opSeq, pieceNo matches the original app's BOM sequence
  const relResult = await pool
    .request()
    .input("baseId", sql.VarChar, baseId)
    .input("lotId", sql.VarChar, lotId).query(`
      SELECT
        r.WORKORDER_SUB_ID AS parentSubId,
        r.SUBORD_WO_SUB_ID AS childSubId,
        r.OPERATION_SEQ_NO AS opSeq,
        r.PIECE_NO AS pieceNo
      FROM REQUIREMENT r WITH (NOLOCK)
      WHERE r.WORKORDER_BASE_ID = @baseId
        AND r.WORKORDER_LOT_ID = @lotId
        AND r.SUBORD_WO_SUB_ID IS NOT NULL
      ORDER BY r.WORKORDER_SUB_ID, r.OPERATION_SEQ_NO, r.PIECE_NO
    `);

  return {
    workOrders: woResult.recordset,
    relationships: relResult.recordset,
  };
}

/**
 * Detailed tree: fetch work orders, operations, materials, and parent-child
 * links as flat data. Tree assembly happens in the service layer.
 *
 * Performance: Four simple indexed queries (~200ms total) replace the
 * recursive CTE + AllNodes UNION ALL that took 30-40s+ on large BOMs.
 */
async function getDetailedTree(baseId, lotId) {
  const pool = await getPool();

  // Query 1: All work orders
  const woResult = await pool
    .request()
    .input("baseId", sql.VarChar, baseId)
    .input("lotId", sql.VarChar, lotId).query(`
      SELECT
        wo.SUB_ID AS subId,
        wo.PART_ID AS partId,
        p.DESCRIPTION AS partDescription,
        ISNULL(wo.DESIRED_QTY, 0) AS orderQty,
        wo.STATUS AS status,
        wo.TYPE AS type,
        wo.SCHED_START_DATE AS startDate,
        wo.SCHED_FINISH_DATE AS finishDate
      FROM WORK_ORDER wo WITH (NOLOCK)
      LEFT JOIN PART p WITH (NOLOCK) ON wo.PART_ID = p.ID
      WHERE wo.BASE_ID = @baseId AND wo.LOT_ID = @lotId
    `);

  if (woResult.recordset.length === 0) {
    return { workOrders: [], relationships: [], operations: [], materials: [] };
  }

  // Query 2: Parent-child relationships with sort order
  const relResult = await pool
    .request()
    .input("baseId", sql.VarChar, baseId)
    .input("lotId", sql.VarChar, lotId).query(`
      SELECT
        r.WORKORDER_SUB_ID AS parentSubId,
        r.SUBORD_WO_SUB_ID AS childSubId,
        r.OPERATION_SEQ_NO AS opSeq,
        r.PIECE_NO AS pieceNo
      FROM REQUIREMENT r WITH (NOLOCK)
      WHERE r.WORKORDER_BASE_ID = @baseId
        AND r.WORKORDER_LOT_ID = @lotId
        AND r.SUBORD_WO_SUB_ID IS NOT NULL
      ORDER BY r.WORKORDER_SUB_ID, r.OPERATION_SEQ_NO, r.PIECE_NO
    `);

  // Query 3: All operations
  const opResult = await pool
    .request()
    .input("baseId", sql.VarChar, baseId)
    .input("lotId", sql.VarChar, lotId).query(`
      SELECT
        op.WORKORDER_SUB_ID AS subId,
        op.SEQUENCE_NO AS opSeq,
        op.RESOURCE_ID AS resourceId,
        sr.DESCRIPTION AS resourceDescription,
        op.STATUS AS status
      FROM OPERATION op WITH (NOLOCK)
      LEFT JOIN SHOP_RESOURCE sr WITH (NOLOCK) ON op.RESOURCE_ID = sr.ID
      WHERE op.WORKORDER_BASE_ID = @baseId AND op.WORKORDER_LOT_ID = @lotId
      ORDER BY op.WORKORDER_SUB_ID, op.SEQUENCE_NO
    `);

  // Query 4: All material requirements (non-subordinate only)
  const matResult = await pool
    .request()
    .input("baseId", sql.VarChar, baseId)
    .input("lotId", sql.VarChar, lotId).query(`
      SELECT
        r.WORKORDER_SUB_ID AS subId,
        r.OPERATION_SEQ_NO AS opSeq,
        r.PIECE_NO AS pieceNo,
        r.PART_ID AS partId,
        p.DESCRIPTION AS partDescription,
        r.CALC_QTY AS qty,
        r.STATUS AS status,
        r.DIMENSIONS AS dimensions
      FROM REQUIREMENT r WITH (NOLOCK)
      LEFT JOIN PART p WITH (NOLOCK) ON r.PART_ID = p.ID
      WHERE r.WORKORDER_BASE_ID = @baseId
        AND r.WORKORDER_LOT_ID = @lotId
        AND r.SUBORD_WO_SUB_ID IS NULL
      ORDER BY r.WORKORDER_SUB_ID, r.OPERATION_SEQ_NO, r.PIECE_NO
    `);

  return {
    workOrders: woResult.recordset,
    relationships: relResult.recordset,
    operations: opResult.recordset,
    materials: matResult.recordset,
  };
}

module.exports = {
  getSimplifiedTree,
  getDetailedTree,
};
