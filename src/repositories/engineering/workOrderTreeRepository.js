const { getPool, sql } = require("../../database");

/**
 * Simplified tree: work order hierarchy only (no operations/materials)
 * Uses recursive CTE to walk REQUIREMENT parent→child links
 */
async function getSimplifiedTree(baseId, lotId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("baseId", sql.VarChar, baseId)
    .input("lotId", sql.VarChar, lotId).query(`
      ;WITH WO_Tree AS (
        SELECT
          wo.SUB_ID AS subId,
          wo.PART_ID AS partId,
          ISNULL(wo.DESIRED_QTY, 0) AS orderQty,
          wo.STATUS AS status,
          wo.TYPE AS type,
          wo.SCHED_START_DATE AS startDate,
          wo.SCHED_FINISH_DATE AS finishDate,
          wo.CLOSE_DATE AS closeDate,
          CAST(NULL AS VARCHAR(3)) AS parentSubId,
          0 AS depth,
          CAST(RIGHT('000' + wo.SUB_ID, 3) AS VARCHAR(500)) AS sortPath
        FROM WORK_ORDER wo WITH (NOLOCK)
        WHERE wo.BASE_ID = @baseId AND wo.LOT_ID = @lotId AND wo.SUB_ID = '0'

        UNION ALL

        SELECT
          wo.SUB_ID,
          wo.PART_ID,
          ISNULL(wo.DESIRED_QTY, 0),
          wo.STATUS,
          wo.TYPE,
          wo.SCHED_START_DATE,
          wo.SCHED_FINISH_DATE,
          wo.CLOSE_DATE,
          r.WORKORDER_SUB_ID,
          t.depth + 1,
          CAST(t.sortPath + '.' + RIGHT('000' + wo.SUB_ID, 3) AS VARCHAR(500))
        FROM WO_Tree t
        JOIN REQUIREMENT r WITH (NOLOCK)
          ON r.WORKORDER_BASE_ID = @baseId
          AND r.WORKORDER_LOT_ID = @lotId
          AND r.WORKORDER_SUB_ID = t.subId
          AND r.SUBORD_WO_SUB_ID IS NOT NULL
        JOIN WORK_ORDER wo WITH (NOLOCK)
          ON wo.BASE_ID = @baseId
          AND wo.LOT_ID = @lotId
          AND wo.SUB_ID = r.SUBORD_WO_SUB_ID
      )
      SELECT
        t.subId,
        t.partId,
        p.DESCRIPTION AS partDescription,
        t.orderQty,
        t.status,
        t.type,
        t.startDate,
        t.finishDate,
        t.closeDate,
        t.parentSubId,
        t.depth,
        t.sortPath
      FROM WO_Tree t
      LEFT JOIN PART p WITH (NOLOCK) ON t.partId = p.ID
      ORDER BY t.sortPath
    `);

  return result.recordset;
}

/**
 * Detailed tree: work orders + operations + material requirements
 * Uses recursive CTE for WO hierarchy, then unions in operations and materials
 *
 * Depth logic:
 *   WO root = 0, its OPs = 1, its MATs/child WOs = 2
 *   Child WO = parentWO.depth + 2  (sibling with materials under the same operation)
 *   Child OP = childWO.depth + 1, Child MAT = childWO.depth + 2
 */
async function getDetailedTree(baseId, lotId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input("baseId", sql.VarChar, baseId)
    .input("lotId", sql.VarChar, lotId).query(`
      ;WITH WO_Tree AS (
        SELECT
          wo.SUB_ID AS subId,
          wo.PART_ID AS partId,
          ISNULL(wo.DESIRED_QTY, 0) AS orderQty,
          wo.STATUS AS status,
          wo.TYPE AS type,
          wo.SCHED_START_DATE AS startDate,
          wo.SCHED_FINISH_DATE AS finishDate,
          CAST(NULL AS VARCHAR(3)) AS parentSubId,
          CAST(NULL AS SMALLINT) AS parentOpSeq,
          CAST(NULL AS SMALLINT) AS linkPieceNo,
          0 AS depth,
          CAST(RIGHT('000' + wo.SUB_ID, 3) AS VARCHAR(500)) AS sortPath
        FROM WORK_ORDER wo WITH (NOLOCK)
        WHERE wo.BASE_ID = @baseId AND wo.LOT_ID = @lotId AND wo.SUB_ID = '0'

        UNION ALL

        SELECT
          wo.SUB_ID,
          wo.PART_ID,
          ISNULL(wo.DESIRED_QTY, 0),
          wo.STATUS,
          wo.TYPE,
          wo.SCHED_START_DATE,
          wo.SCHED_FINISH_DATE,
          r.WORKORDER_SUB_ID,
          r.OPERATION_SEQ_NO,
          r.PIECE_NO,
          t.depth + 2,
          CAST(t.sortPath + '.' + RIGHT('000' + wo.SUB_ID, 3) AS VARCHAR(500))
        FROM WO_Tree t
        JOIN REQUIREMENT r WITH (NOLOCK)
          ON r.WORKORDER_BASE_ID = @baseId
          AND r.WORKORDER_LOT_ID = @lotId
          AND r.WORKORDER_SUB_ID = t.subId
          AND r.SUBORD_WO_SUB_ID IS NOT NULL
        JOIN WORK_ORDER wo WITH (NOLOCK)
          ON wo.BASE_ID = @baseId
          AND wo.LOT_ID = @lotId
          AND wo.SUB_ID = r.SUBORD_WO_SUB_ID
      ),
      AllNodes AS (
        -- Work order nodes
        SELECT
          'WO' AS nodeType,
          w.depth,
          w.sortPath + '-0000-0000' AS sortKey,
          w.subId,
          w.partId,
          w.orderQty AS qty,
          w.status,
          w.type,
          w.startDate,
          w.finishDate,
          CAST(NULL AS SMALLINT) AS opSeq,
          CAST(NULL AS VARCHAR(15)) AS resourceId,
          CAST(NULL AS VARCHAR(80)) AS dimensions,
          CAST(NULL AS SMALLINT) AS pieceNo,
          w.parentSubId,
          w.parentOpSeq
        FROM WO_Tree w

        UNION ALL

        -- Operation nodes (depth = parent WO depth + 1)
        SELECT
          'OP',
          w.depth + 1,
          w.sortPath + '-' + RIGHT('0000' + CAST(op.SEQUENCE_NO AS VARCHAR), 4) + '-0000',
          op.WORKORDER_SUB_ID,
          NULL,
          NULL,
          op.STATUS,
          NULL,
          NULL,
          NULL,
          op.SEQUENCE_NO,
          op.RESOURCE_ID,
          NULL,
          NULL,
          NULL,
          NULL
        FROM OPERATION op WITH (NOLOCK)
        JOIN WO_Tree w ON op.WORKORDER_SUB_ID = w.subId
        WHERE op.WORKORDER_BASE_ID = @baseId AND op.WORKORDER_LOT_ID = @lotId

        UNION ALL

        -- Material / purchased part nodes (depth = parent WO depth + 2)
        SELECT
          'MAT',
          w.depth + 2,
          w.sortPath + '-' + RIGHT('0000' + CAST(r.OPERATION_SEQ_NO AS VARCHAR), 4)
            + '-' + RIGHT('0000' + CAST(r.PIECE_NO AS VARCHAR), 4),
          r.WORKORDER_SUB_ID,
          r.PART_ID,
          r.CALC_QTY,
          r.STATUS,
          NULL,
          NULL,
          NULL,
          r.OPERATION_SEQ_NO,
          NULL,
          r.DIMENSIONS,
          r.PIECE_NO,
          NULL,
          NULL
        FROM REQUIREMENT r WITH (NOLOCK)
        JOIN WO_Tree w ON r.WORKORDER_SUB_ID = w.subId
        WHERE r.WORKORDER_BASE_ID = @baseId AND r.WORKORDER_LOT_ID = @lotId
          AND r.SUBORD_WO_SUB_ID IS NULL
      )
      SELECT
        n.nodeType,
        n.depth,
        n.subId,
        n.partId,
        p.DESCRIPTION AS partDescription,
        n.qty,
        n.status,
        n.type,
        n.startDate,
        n.finishDate,
        n.opSeq,
        n.resourceId,
        sr.DESCRIPTION AS resourceDescription,
        n.dimensions,
        n.pieceNo,
        n.parentSubId,
        n.parentOpSeq,
        n.sortKey
      FROM AllNodes n
      LEFT JOIN PART p WITH (NOLOCK) ON n.partId = p.ID
      LEFT JOIN SHOP_RESOURCE sr WITH (NOLOCK) ON n.resourceId = sr.ID
      ORDER BY n.sortKey
    `);

  return result.recordset;
}

module.exports = {
  getSimplifiedTree,
  getDetailedTree,
};
